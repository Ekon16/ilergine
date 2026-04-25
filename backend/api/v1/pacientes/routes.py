from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import get_current_user_id
from models.models import Paciente
from schemas.schemas import PacienteResponse

router = APIRouter(prefix="/pacientes", tags=["pacientes"])


@router.get("/{paciente_id}", response_model=PacienteResponse)
async def get_paciente(
    paciente_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    result = await db.execute(
        select(Paciente).where(Paciente.id == paciente_id)
    )
    paciente = result.scalar_one_or_none()
    if not paciente:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    return PacienteResponse.model_validate(paciente)


@router.get("/search/{q}", response_model=list[PacienteResponse])
async def search_pacientes(
    q: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    result = await db.execute(
        select(Paciente)
        .where(
            (Paciente.nombre.ilike(f"%{q}%"))
            | (Paciente.apellidos.ilike(f"%{q}%"))
        )
        .order_by(Paciente.apellidos)
        .limit(20)
    )
    pacientes = result.scalars().all()
    return [PacienteResponse.model_validate(p) for p in pacientes]
