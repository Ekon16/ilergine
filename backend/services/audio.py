import os
import io
import base64
import uuid
import subprocess
from pathlib import Path
from core.config import settings


def ensure_audio_dir():
    os.makedirs(settings.AUDIO_TEMP_DIR, exist_ok=True)


def decode_base64_audio(b64_data: str) -> bytes:
    return base64.b64decode(b64_data)


def save_webm_chunk(audio_bytes: bytes) -> str:
    ensure_audio_dir()
    filename = f"{uuid.uuid4()}.webm"
    filepath = os.path.join(settings.AUDIO_TEMP_DIR, filename)
    Path(filepath).write_bytes(audio_bytes)
    return filepath


def convert_webm_bytes_to_wav(audio_bytes: bytes) -> bytes:
    """Convierte audio a WAV PCM 16kHz mono usando ffmpeg vía pipe."""
    cmd = [
        "ffmpeg",
        "-i", "pipe:0",
        "-acodec", "pcm_s16le",
        "-ac", "1",
        "-ar", "16000",
        "-f", "wav",
        "pipe:1",
    ]
    proc = subprocess.run(
        cmd,
        input=audio_bytes,
        capture_output=True,
        timeout=15,
    )
    if proc.returncode != 0:
        stderr = proc.stderr.decode("utf-8", errors="replace")[-300:]
        raise RuntimeError(f"ffmpeg: {stderr.strip()}")
    if len(proc.stdout) < 44:  # min WAV header size
        raise RuntimeError("ffmpeg produced empty or invalid WAV")
    return proc.stdout


def cleanup_chunk(filepath: str):
    try:
        if os.path.exists(filepath):
            os.remove(filepath)
    except OSError:
        pass
