import json
import re
import httpx
from core.config import settings
from schemas.schemas import InsightsOllama, PacienteContexto


SYSTEM_PROMPT_TEMPLATE = """Eres un asistente médico especializado en ginecología.
Contexto del paciente actual:
- Nombre: {nombre_completo}
- Alergias: {alergias}
- Antecedentes ginecológicos: {antecedentes}
- Última visita: {ultima_visita}

{visitas_previas}

Analiza la siguiente transcripción de consulta médica en español. Detecta tareas clínicas pendientes, datos personales de la paciente mencionados, y sugiere preguntas o conclusiones relevantes.

Responde EXCLUSIVAMENTE con JSON válido, sin texto antes ni después. No uses markdown ni bloques de código.

Esquema JSON OBLIGATORIO:
{{
  "checklist_tareas": [{{"tipo": "receta|volante|prueba", "detalle": "string", "completado": false}}],
  "rapport_personal": ["string"],
  "sugerencias_vivo": ["string"]
}}"""


def extract_json_from_text(text: str) -> str:
    """Extrae el primer JSON válido del texto, descartando markdown y texto extra."""
    text = text.strip()

    # Intentar remover bloques de markdown ```json ... ```
    if text.startswith("```"):
        lines = text.split("\n")
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        text = "\n".join(lines).strip()

    # Buscar el primer { y el último }
    match = re.search(r"\{[\s\S]*\}", text)
    if match:
        return match.group(0)

    return text


def build_system_prompt(contexto: PacienteContexto) -> str:
    visitas_text = ""
    if contexto.visitas_previas:
        visitas_text = "Visitas previas:\n" + "\n".join(
            f"- {v}" for v in contexto.visitas_previas
        )

    return SYSTEM_PROMPT_TEMPLATE.format(
        nombre_completo=contexto.nombre_completo,
        alergias=", ".join(contexto.alergias) if contexto.alergias else "Ninguna conocida",
        antecedentes=contexto.antecedentes or "No registrados",
        ultima_visita=contexto.ultima_visita or "No hay registros previos",
        visitas_previas=visitas_text,
    )


async def query_ollama(
    transcription: str,
    contexto: PacienteContexto,
    max_retries: int = 3,
) -> InsightsOllama | None:
    system_prompt = build_system_prompt(contexto)

    payload = {
        "model": settings.OLLAMA_MODEL,
        "system": system_prompt,
        "prompt": f"Transcripción de la consulta:\n{transcription}\n\nGenera el JSON de insights:",
        "stream": False,
        "format": "json",
        "options": {
            "temperature": 0.1,
            "num_predict": 2048,
        },
    }

    for attempt in range(max_retries):
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{settings.OLLAMA_BASE_URL}/api/generate",
                    json=payload,
                )
                response.raise_for_status()
                raw = response.json()
                raw_text = raw.get("response", "")

                json_str = extract_json_from_text(raw_text)

                try:
                    data = json.loads(json_str)
                except json.JSONDecodeError:
                    if attempt < max_retries - 1:
                        payload["prompt"] = (
                            f"Transcripción:\n{transcription}\n\n"
                            f"Tu respuesta anterior no era JSON válido. "
                            f"Responde SOLO con JSON sin texto extra."
                        )
                        continue
                    return None

                insights = InsightsOllama(**data)
                return insights

        except (httpx.RequestError, httpx.HTTPStatusError):
            if attempt < max_retries - 1:
                continue
            return None
        except Exception:
            return None

    return None


async def check_ollama_health() -> bool:
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{settings.OLLAMA_BASE_URL}/api/tags")
            return response.status_code == 200
    except Exception:
        return False
