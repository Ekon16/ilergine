import json
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db, async_session_maker
from core.security import verify_ws_token
from models.models import Paciente, Visita, Consulta
from schemas.schemas import (
    PacienteContexto,
    InsightsOllama,
    WSMessage,
    FinalizarConsultaRequest,
    ConsultaResponse,
)
from services.audio import (
    decode_base64_audio,
    save_webm_chunk,
    convert_webm_bytes_to_wav,
    cleanup_chunk,
)
from services.whisper import get_whisper
from services.ollama import query_ollama
from core.config import settings

router = APIRouter(prefix="/consultas", tags=["consultas"])


async def get_paciente_contexto(db: AsyncSession, paciente_id: str) -> PacienteContexto:
    result = await db.execute(
        select(Paciente).where(Paciente.id == paciente_id)
    )
    paciente = result.scalar_one_or_none()
    if not paciente:
        return PacienteContexto(
            nombre_completo="Paciente desconocido",
            alergias=[],
            antecedentes="",
        )

    visitas_result = await db.execute(
        select(Visita)
        .where(Visita.paciente_id == paciente_id)
        .order_by(Visita.fecha.desc())
        .limit(5)
    )
    visitas = visitas_result.scalars().all()

    ultima_visita = None
    visitas_previas = []
    if visitas:
        ultima_visita = visitas[0].fecha.strftime("%d/%m/%Y")
        visitas_previas = [
            f"{v.fecha.strftime('%d/%m/%Y')} - {v.motivo or 'Sin motivo'}: {v.diagnostico or 'Sin diagnóstico'}"
            for v in visitas
        ]

    return PacienteContexto(
        nombre_completo=f"{paciente.nombre} {paciente.apellidos}",
        alergias=paciente.alergias or [],
        antecedentes=paciente.antecedentes_ginecologicos or "",
        ultima_visita=ultima_visita,
        visitas_previas=visitas_previas,
    )


@router.websocket("/live/{paciente_id}")
async def consulta_live(
    websocket: WebSocket,
    paciente_id: str,
):
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4001, reason="Token requerido")
        return

    try:
        user_id = verify_ws_token(token)
    except HTTPException:
        await websocket.close(code=4001, reason="Token inválido")
        return

    await websocket.accept()

    db_session = async_session_maker()
    paciente_sealed = False
    transcripcion_completa = []
    last_ollama_call = datetime.now(timezone.utc)

    try:
        contexto = await get_paciente_contexto(db_session, paciente_id)

        await websocket.send_json({
            "type": "status",
            "status": "listening",
            "paciente": contexto.nombre_completo,
        })

        whisper_service = get_whisper()

        consulta_id = uuid.uuid4()

        while True:
            raw = await websocket.receive_text()
            msg = json.loads(raw)

            if msg.get("type") == "audio_chunk":
                b64_data = msg.get("data", "")
                if not b64_data:
                    continue

                audio_bytes = decode_base64_audio(b64_data)
                chunk_path = save_webm_chunk(audio_bytes)

                try:
                    wav_bytes = convert_webm_bytes_to_wav(audio_bytes)
                except Exception:
                    cleanup_chunk(chunk_path)
                    continue

                try:
                    transcription = await whisper_service.transcribe(wav_bytes)
                except Exception:
                    cleanup_chunk(chunk_path)
                    continue

                cleanup_chunk(chunk_path)

                if not transcription.strip():
                    continue

                transcripcion_completa.append(transcription)

                await websocket.send_json({
                    "type": "transcription",
                    "text": transcription,
                    "speaker": "doctor",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                })

                now = datetime.now(timezone.utc)
                if (now - last_ollama_call).total_seconds() >= 30 and len(transcripcion_completa) > 0:
                    full_transcript = " ".join(transcripcion_completa)
                    insights = await query_ollama(full_transcript, contexto)

                    if insights:
                        await websocket.send_json({
                            "type": "insights",
                            "data": insights.model_dump(),
                        })

                    last_ollama_call = now

            elif msg.get("type") == "finalizar":
                full_transcript = " ".join(transcripcion_completa)

                insights = await query_ollama(full_transcript, contexto)
                if not insights:
                    insights = InsightsOllama(
                        checklist_tareas=[],
                        rapport_personal=[],
                        sugerencias_vivo=[],
                    )

                consulta = Consulta(
                    id=consulta_id,
                    paciente_id=uuid.UUID(paciente_id),
                    usuario_id=uuid.UUID(user_id),
                    fecha_inicio=last_ollama_call,
                    fecha_fin=datetime.now(timezone.utc),
                    transcripcion=full_transcript,
                    insights=insights.model_dump(),
                    peso=msg.get("peso"),
                    tension=msg.get("tension"),
                )
                db_session.add(consulta)
                await db_session.commit()

                await websocket.send_json({
                    "type": "finalizado",
                    "resumen": {
                        "recetas": sum(1 for t in insights.checklist_tareas if t.tipo == "receta"),
                        "volantes": sum(1 for t in insights.checklist_tareas if t.tipo == "volante"),
                        "pruebas": sum(1 for t in insights.checklist_tareas if t.tipo == "prueba"),
                    },
                    "data": insights.model_dump(),
                })

                await websocket.close(code=1000, reason="Consulta finalizada")
                return

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass
    finally:
        if not paciente_sealed:
            await db_session.close()
