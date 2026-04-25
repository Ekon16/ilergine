# AGENTS.md - Ilergine Project Conventions

## Stack Tecnológico

- **Frontend**: Next.js 14+ (App Router), TypeScript, Tailwind CSS, Shadcn/ui
- **Gestión de Estado**: Zustand (OBLIGATORIO para evitar parpadeos en WebSockets)
- **Backend**: Python 3.11+, FastAPI, WebSockets, Asyncio, JWT
- **Procesamiento Audio**: ffmpeg-python o pydub (WebM a PCM/WAV)
- **Base de Datos**: PostgreSQL + pgvector, SQLAlchemy asíncrono o SQLModel
- **IA Local**: faster-whisper (small/base, language="es"), ollama (Llama 3 8B q4_K_M)
- **Infraestructura**: Docker + Docker Compose (On-Premise, 100% privacidad)

## Directivas Estrictas

### Tipado
- NUNCA usar tipos `any` en TypeScript o Python
- Usar Pydantic v2 con下一代 validación (No usar BaseModel deprecated)
- TypeScript: interfaces explícitas para todos los estados Zustand

### WebSockets
- El Frontend debe reconectar automáticamente si se corta la conexión
- Mostrar "🔴 IA Escuchando" o "Reconectando..." según estado
- Usar Zustand para actualizar transcripción en tiempo real (NO causar re-renders completos)

### Autenticación
- JWT simple con expiración configurable
- Token en Header `Authorization: Bearer <token>`
- Endpoints de WebSocket deben estar asegurados con JWT

### RGPD y Privacidad
- PROHIBICIÓN ABSOLUTA: No enviar datos a APIs externas (ni OpenAI, ni Google, etc.)
- Todos los datos deben quedarse On-Premise
- FFMPEG debe estar instalado en el contenedor Docker
- CRON/Tarea a las 00:00 para purgar archivos de audio del día

### Audio Processing
- WebM Blob del cliente → convertir a PCM/WAV en backend
- faster-whisper forzar `language="es"`
- Transcripción en tiempo real emitirse por WebSocket

### Ollama Integration
- Forzar `format="json"` en la API
- El system prompt debe contener contexto del paciente (historial, alergias, visitas previas)
- Parsing STRICTO del JSON de respuesta (limpiar texto extra que pueda generar Ollama)
- Esquema JSON OBLIGATORIO:

```json
{
  "checklist_tareas": [{"tipo": "receta|volante|prueba", "detalle": "string", "completado": boolean}],
  "rapport_personal": ["string"],
  "sugerencias_vivo": ["string"]
}
```

### UI/UX
- Proporción visual: 60% chat / 40% insights
- Componentes Shadcn/ui exclusivamente
- No generar ni mostrar datos deExample.com

## Comandos de Verificación

```bash
# Lint
npm run lint

# Typecheck
npm run typecheck

# Backend - verificar dependencias
pip list | grep -E "fastapi|pydantic|sqlalchemy|faster-whisper|ollama"
```