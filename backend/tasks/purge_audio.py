import os
from datetime import datetime, timedelta
from core.config import settings


def purge_old_audio():
    """Elimina archivos de audio con más de 24 horas. Se ejecuta a las 00:00 diario."""
    cutoff = datetime.now() - timedelta(hours=24)
    audio_dir = settings.AUDIO_TEMP_DIR

    if not os.path.exists(audio_dir):
        return

    for filename in os.listdir(audio_dir):
        filepath = os.path.join(audio_dir, filename)
        if not os.path.isfile(filepath):
            continue
        try:
            mtime = datetime.fromtimestamp(os.path.getmtime(filepath))
            if mtime < cutoff:
                os.remove(filepath)
        except OSError:
            pass
