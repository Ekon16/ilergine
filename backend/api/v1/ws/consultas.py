import json
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path

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

    try:
        contexto = await get_paciente_contexto(db_session, paciente_id)

        await websocket.send_json({
            "type": "status",
            "status": "listening",
            "paciente": contexto.nombre_completo,
        })

        whisper_service = get_whisper()

        consulta_id = uuid.uuid4()

        accumulated_audio: list[bytes] = []
        last_transcription_time = datetime.now(timezone.utc)
        last_ollama_call = datetime.now(timezone.utc)

        while True:
            raw = await websocket.receive()

            if "text" in raw:
                msg = json.loads(raw["text"])
                print(f"[WS] Received JSON: {msg.get('type')}", flush=True)

                if msg.get("type") == "finalizar":
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

            elif "bytes" in raw:
                audio_bytes = raw["bytes"]
                accumulated_audio.append(audio_bytes)

                now = datetime.now(timezone.utc)
                if (now - last_transcription_time).total_seconds() >= 3 and len(accumulated_audio) > 0:
                    combined = b"".join(accumulated_audio)
                    accumulated_audio = []
                    last_transcription_time = now

                    try:
                        wav = convert_webm_bytes_to_wav(combined)
                    except Exception as e:
                        print(f"[WS] ffmpeg error: {e}", flush=True)
                        continue

                    try:
                        transcription = await whisper_service.transcribe(wav)
                    except Exception as e:
                        print(f"[WS] whisper error: {e}", flush=True)
                        continue

                    if not transcription or not transcription.strip():
                        continue

                    # Filtrar alucinaciones comunes del modelo con silencio
                    hallucination_patterns = [
                        "subtítulos", "amara.org", "amara org",
                        "comunidad de amara", "subtitulos", "www.",
                    ]
                    text_lower = transcription.strip().lower()
                    if any(p in text_lower for p in hallucination_patterns):
                        if len(text_lower) < 80:
                            print(f"[WS] Filtered hallucination: {transcription}", flush=True)
                            continue

                    transcripcion_completa.append(transcription)

                    await websocket.send_json({
                        "type": "transcription",
                        "text": transcription,
                        "speaker": "doctor",
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    })

                    print(f"[WS] Transcribed: {transcription[:120]}", flush=True)

                    # Ollama cada ~30 segundos
                    if (now - last_ollama_call).total_seconds() >= 30 and len(transcripcion_completa) > 0:
                        full_transcript = " ".join(transcripcion_completa)
                        insights = await query_ollama(full_transcript, contexto)
                        if insights:
                            await websocket.send_json({
                                "type": "insights",
                                "data": insights.model_dump(),
                            })
                        last_ollama_call = now

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
