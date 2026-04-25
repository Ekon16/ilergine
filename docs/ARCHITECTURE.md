# Arquitectura Ilergine - ERP Médico

## Visión General

Ilergine es un ERP médico que proporciona **Inteligencia Clínica Ambiental**. El médico interactúa verbalmente con la paciente mientras el sistema escucha, transcribe y genera insights en tiempo real.

**Principio**: 100% On-Premise, cero APIs externas.

---

## Arquitectura de Alto Nivel

```
┌─────────────┐     WebSocket      ┌─────────────┐     HTTP/WS     ┌─────────────┐
│   Frontend  │◄──────────────────►│   Backend   │◄───────────────►│  PostgreSQL │
│  (Next.js)  │   Audio Chunks     │  (FastAPI)  │                │  + pgvector │
└─────────────┘                    └──────┬──────┘                └─────────────┘
                                         │
                    ┌────────────────────┴────────────────────┐
                    │                                         │
               ┌────▼────┐                              ┌─────▼─────┐
               │ faster- │                              │  ollama   │
               │ whisper │                              │ (Llama 3) │
               └─────────┘                              └───────────┘
```

---

## Flujo de WebSockets

### Conexión
1. Frontend conecta a `ws://host/api/v1/consultas/live/{paciente_id}?token={jwt}`
2. Backend valida JWT y obtiene historial del paciente de PostgreSQL
3. Backend inyecta contexto en System Prompt de Ollama

### Audio Processing
```
Frontend                          Backend
   │                                  │
   │──── WebM Blob (chunk) ──────────►│
   │                                  │ 1. Guardar .webm en /tmp/audio/
   │                                  │ 2. Convertir WebM → PCM/WAV (pydub)
   │                                  │ 3. faster-whisper.transcribe() [language="es"]
   │◄─── Transcripción texto ─────────│
   │                                  │
   │          [cada ~30 seg o 100 palabras]
   │                                  │ 4. Enviar transcripción + contexto a Ollama
   │                                  │    POST /api/generate con format="json"
   │◄─── JSON insights ───────────────│
```

### Mensajes WebSocket

#### Cliente → Servidor
```json
{
  "type": "audio_chunk",
  "data": "<base64_audio>"
}
```

#### Servidor → Cliente
```json
{
  "type": "transcription",
  "text": "string",
  "speaker": "doctor|paciente",
  "timestamp": "ISO8601"
}
```

```json
{
  "type": "insights",
  "data": {
    "checklist_tareas": [...],
    "rapport_personal": [...],
    "sugerencias_vivo": [...]
  }
}
```

```json
{
  "type": "status",
  "status": "listening|processing|error|reconnecting"
}
```

---

## Base de Datos

### Esquema PostgreSQL

```sql
-- Tabla de usuarios (médicos)
CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    especialidad VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de pacientes
CREATE TABLE pacientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(255) NOT NULL,
    apellidos VARCHAR(255) NOT NULL,
    fecha_nacimiento DATE NOT NULL,
    telefono VARCHAR(20),
    email VARCHAR(255),
    alergias TEXT[],
    antecedentes_ginecologicos TEXT,
    notas TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de consultas
CREATE TABLE consultas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id UUID REFERENCES pacientes(id),
    usuario_id UUID REFERENCES usuarios(id),
    fecha_inicio TIMESTAMP NOT NULL,
    fecha_fin TIMESTAMP,
    transcripcion TEXT,
    insights JSONB,
    peso DECIMAL(5,2),
    tension VARCHAR(10),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de visitas previas
CREATE TABLE visitas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id UUID REFERENCES pacientes(id),
    fecha DATE NOT NULL,
    motivo VARCHAR(255),
    diagnostico TEXT,
    tratamiento TEXT,
    notas TEXT
);
```

### Índices
```sql
CREATE INDEX idx_pacientes_nombre ON pacientes(nombre);
CREATE INDEX idx_consultas_paciente ON consultas(paciente_id);
CREATE INDEX idx_visitas_paciente ON visitas(paciente_id);
```

---

## Ollama Integration

### System Prompt Template
```
Eres un asistente médico especializado en ginecología.
Contexto del paciente actual:
- Nombre: {nombre_paciente}
- Alergias: {alergias}
- Antecedentes: {antecedentes}
- Última visita: {ultima_visita}

Analiza la siguiente transcripción de consulta y genera insights JSON.
Responde SOLO con JSON válido, sin texto adicional.

Esquema JSON OBLIGATORIO:
{
  "checklist_tareas": [
    {"tipo": "receta|volante|prueba", "detalle": "string", "completado": boolean}
  ],
  "rapport_personal": ["string (datos triviales: aficiones, familia, trabajo)"],
  "sugerencias_vivo": ["string (preguntas sugeridas o conclusiones clínicas)"]
}
```

### Parsing Strategy
1. Enviar request con `format="json"`
2. Limpiar respuesta: extraer solo el JSON (regex `\{[\s\S]*\}`)
3. Validar con Pydantic v2
4. Si falla, reintentar hasta 3 veces

---

## RGPD - Purga de Audio

### Política
- Audios temporales se almacenan en `/tmp/audio/`
- Tarea CRON/Docker ejecuta purga a las 00:00
- Elimina todos los archivos con más de 24h

### Implementación
```python
# backend/tasks/purge_audio.py
from datetime import datetime, timedelta
import os

def purge_old_audio():
    cutoff = datetime.now() - timedelta(hours=24)
    audio_dir = "/tmp/audio/"
    for filename in os.listdir(audio_dir):
        filepath = os.path.join(audio_dir, filename)
        if os.path.getmtime(filepath) < cutoff.timestamp():
            os.remove(filepath)
```

---

## Estructura de Archivos

```
/ERPMedical
├── /frontend              # Next.js 14+ App Router
│   ├── /app
│   │   ├── /login
│   │   ├── /consulta/[id]
│   │   └── /api
│   ├── /components
│   │   ├── /ui          # Shadcn components
│   │   ├── /chat
│   │   ├── /insights
│   │   └── /paciente
│   ├── /stores           # Zustand stores
│   └── /lib
├── /backend              # FastAPI
│   ├── /api
│   │   └── /v1
│   │       ├── /auth
│   │       ├── /pacientes
│   │       ├── /consultas
│   │       └── /ws
│   ├── /core
│   │   ├── /security.py  # JWT
│   │   └── /config.py
│   ├── /models
│   ├── /services
│   │   ├── /whisper.py
│   │   └── /ollama.py
│   ├── /tasks
│   │   └── /purge_audio.py
│   └── main.py
├── /docs
│   ├── ARCHITECTURE.md
│   └── API.md
├── /infra
│   ├── Dockerfile.frontend
│   ├── Dockerfile.backend
│   └── docker-compose.yml
└── AGENTS.md
```

---

## Seguridad

### JWT
- Algoritmo: HS256
- Expiración: 8 horas (configurable)
- Payload: `{ "sub": user_id, "exp": timestamp }`

### CORS
-whitelist de orígenes configurables
- Solo métodos HTTP necesarios

### WebSocket Auth
- Token JWT como query param: `?token={jwt}`
- Validación en cada conexión

---

## Dependencias

### Backend (requirements.txt)
```
fastapi>=0.109.0
uvicorn[standard]>=0.27.0
websockets>=12.0
python-jose[cryptography]>=3.3.0
passlib[bcrypt]>=1.7.4
sqlalchemy[asyncio]>=2.0.25
asyncpg>=0.29.0
pydantic>=2.5.0
pydantic-settings>=2.1.0
pydub>=0.25.1
ffmpeg-python>=0.2.0
faster-whisper>=1.0.0
httpx>=0.26.0
apscheduler>=3.10.0
```

### Frontend (package.json)
```json
{
  "dependencies": {
    "next": "14.x",
    "react": "18.x",
    "zusta": "4.x",
    "@radix-ui/react-dialog": "latest",
    "@radix-ui/react-accordion": "latest",
    "@radix-ui/react-toast": "latest",
    "tailwindcss": "3.x",
    "class-variance-authority": "latest",
    "clsx": "latest",
    "tailwind-merge": "latest",
    "lucide-react": "latest"
  }
}
```