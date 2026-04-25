import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    usuario: "UsuarioResponse"


class UsuarioResponse(BaseModel):
    id: uuid.UUID
    email: str
    nombre: str
    especialidad: Optional[str] = None

    model_config = {"from_attributes": True}


class PacienteResponse(BaseModel):
    id: uuid.UUID
    nombre: str
    apellidos: str
    fecha_nacimiento: datetime
    telefono: Optional[str] = None
    email: Optional[str] = None
    alergias: Optional[list[str]] = None
    antecedentes_ginecologicos: Optional[str] = None
    notas: Optional[str] = None

    model_config = {"from_attributes": True}


class PacienteContexto(BaseModel):
    nombre_completo: str
    alergias: list[str]
    antecedentes: str
    ultima_visita: Optional[str] = None
    visitas_previas: list[str] = []


class ChecklistItem(BaseModel):
    tipo: str
    detalle: str
    completado: bool = False


class InsightsOllama(BaseModel):
    checklist_tareas: list[ChecklistItem] = []
    rapport_personal: list[str] = []
    sugerencias_vivo: list[str] = []


class WSMessage(BaseModel):
    type: str
    data: Optional[str] = None
    text: Optional[str] = None
    speaker: Optional[str] = None
    timestamp: Optional[str] = None


class FinalizarConsultaRequest(BaseModel):
    paciente_id: uuid.UUID
    transcripcion: str
    insights: InsightsOllama
    peso: Optional[float] = None
    tension: Optional[str] = None


class ConsultaResponse(BaseModel):
    id: uuid.UUID
    paciente_id: uuid.UUID
    usuario_id: uuid.UUID
    fecha_inicio: datetime
    fecha_fin: Optional[datetime] = None
    transcripcion: Optional[str] = None
    insights: Optional[InsightsOllama] = None
    peso: Optional[float] = None
    tension: Optional[str] = None

    model_config = {"from_attributes": True}