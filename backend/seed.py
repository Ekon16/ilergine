import asyncio
import sys
import os
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.database import init_db, async_session_maker
from core.security import get_password_hash
from models.models import Usuario, Paciente, Visita


async def seed():
    await init_db()

    async with async_session_maker() as session:
        # Verificar si ya hay datos
        from sqlalchemy import select, func
        result = await session.execute(select(func.count()).select_from(Usuario))
        if result.scalar() > 0:
            print("Base de datos ya contiene datos. Saltando seed.")
            return

        # Crear usuario médico
        usuario = Usuario(
            email="dr.garcia@clinica.es",
            password_hash=get_password_hash("admin123"),
            nombre="Dr. Alejandro García",
            especialidad="Ginecología",
        )
        session.add(usuario)
        await session.flush()

        # Paciente 1: María Pérez Gómez
        paciente1 = Paciente(
            nombre="María",
            apellidos="Pérez Gómez",
            fecha_nacimiento=date(1990, 5, 15),
            telefono="+34 612 345 678",
            email="maria.perez@email.com",
            alergias=["Penicilina", "Ibuprofeno"],
            antecedentes_ginecologicos="G2 P2 A0 C0. Menarquía a los 13 años. Ciclos regulares 28/5. FUR: 2024-03-10. Última citología: 2023-11 (normal). Antecedente de mioma intramural de 2cm asintomático.",
            notas="Paciente con seguimiento regular. Pendiente de revisión de ecografía de control de mioma.",
        )
        session.add(paciente1)
        await session.flush()

        visita1_1 = Visita(
            paciente_id=paciente1.id,
            fecha=date(2024, 1, 15),
            motivo="Revisión ginecológica anual",
            diagnostico="Sin alteraciones. Citología pendiente de resultado.",
            tratamiento="Solicitud de citología y ecografía ginecológica de control.",
            notas="Paciente refiere reglas dolorosas los primeros 2 días (dismenorrea leve).",
        )
        visita1_2 = Visita(
            paciente_id=paciente1.id,
            fecha=date(2023, 6, 20),
            motivo="Control de mioma intramural",
            diagnostico="Mioma intramural de 2 cm en cara anterior. Estable respecto a control previo.",
            tratamiento="Control ecográfico anual. Anticonceptivos orales si molestias.",
            notas="Paciente asintomática. Hemoglobina normal (13.2 g/dL).",
        )
        session.add_all([visita1_1, visita1_2])
        await session.flush()

        # Paciente 2: Ana López Martínez
        paciente2 = Paciente(
            nombre="Ana",
            apellidos="López Martínez",
            fecha_nacimiento=date(1985, 9, 23),
            telefono="+34 698 765 432",
            email="ana.lopez@email.com",
            alergias=["Sulfamidas"],
            antecedentes_ginecologicos="G3 P2 A1 C0. Menarquía a los 11 años. Ciclos irregulares 35-45/7. Sd. de ovario poliquístico diagnosticado en 2018. FUR: 2024-02-28. Última citología: 2023-09 (normal).",
            notas="Paciente con SOP. En tratamiento con metformina. Deseo genésico no cumplido actualmente.",
        )
        session.add(paciente2)
        await session.flush()

        visita2_1 = Visita(
            paciente_id=paciente2.id,
            fecha=date(2024, 2, 10),
            motivo="Control SOP y fertilidad",
            diagnostico="SOP con ciclos irregulares. Peso estable. IMC 26.5.",
            tratamiento="Metformina 850mg/12h. Control analítico: glucosa, insulina, perfil androgénico. Inducción de ovulación si no gestación en 3 meses.",
            notas="Paciente lleva 6 meses buscando embarazo. Ecografía: ovarios poliquísticos. Endometrio 8mm.",
        )
        visita2_2 = Visita(
            paciente_id=paciente2.id,
            fecha=date(2023, 9, 5),
            motivo="Citología de control",
            diagnostico="Citología normal. Detección VPH negativa.",
            tratamiento="Repetir citología en 3 años según protocolo.",
            notas="Paciente informada de resultados. Sin incidencias.",
        )
        session.add_all([visita2_1, visita2_2])

        await session.commit()

        print("✓ Seed completado exitosamente.")
        print(f"  - 1 usuario médico: {usuario.email}")
        print(f"  - 2 pacientes con historial clínico")
        print(f"  - 4 visitas previas registradas")


if __name__ == "__main__":
    asyncio.run(seed())
