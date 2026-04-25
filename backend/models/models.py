import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, DateTime, Text, Numeric, Boolean, ForeignKey, Date, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB

from core.database import Base


class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    nombre: Mapped[str] = mapped_column(String(255), nullable=False)
    especialidad: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    consultas: Mapped[list["Consulta"]] = relationship("Consulta", back_populates="usuario")


class Paciente(Base):
    __tablename__ = "pacientes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nombre: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    apellidos: Mapped[str] = mapped_column(String(255), nullable=False)
    fecha_nacimiento: Mapped[datetime] = mapped_column(Date, nullable=False)
    telefono: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    alergias: Mapped[Optional[list[str]]] = mapped_column(ARRAY(String), nullable=True)
    antecedentes_ginecologicos: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    notas: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    consultas: Mapped[list["Consulta"]] = relationship("Consulta", back_populates="paciente")
    visitas: Mapped[list["Visita"]] = relationship("Visita", back_populates="paciente", order_by="Visita.fecha.desc()")


class Consulta(Base):
    __tablename__ = "consultas"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    paciente_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("pacientes.id"), nullable=False, index=True)
    usuario_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("usuarios.id"), nullable=False)
    fecha_inicio: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    fecha_fin: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    transcripcion: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    insights: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    peso: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), nullable=True)
    tension: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    paciente: Mapped["Paciente"] = relationship("Paciente", back_populates="consultas")
    usuario: Mapped["Usuario"] = relationship("Usuario", back_populates="consultas")


class Visita(Base):
    __tablename__ = "visitas"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    paciente_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("pacientes.id"), nullable=False, index=True)
    fecha: Mapped[datetime] = mapped_column(Date, nullable=False)
    motivo: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    diagnostico: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    tratamiento: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    notas: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    paciente: Mapped["Paciente"] = relationship("Paciente", back_populates="visitas")