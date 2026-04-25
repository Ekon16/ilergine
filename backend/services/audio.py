import os
import io
import base64
import uuid
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


def convert_webm_to_wav(webm_path: str) -> bytes:
    from pydub import AudioSegment

    audio = AudioSegment.from_file(webm_path, format="webm")
    wav_buffer = io.BytesIO()
    audio.export(wav_buffer, format="wav")
    wav_buffer.seek(0)
    return wav_buffer.read()


def convert_webm_bytes_to_wav(audio_bytes: bytes) -> bytes:
    import subprocess
    import tempfile

    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as webm_tmp:
        webm_tmp.write(audio_bytes)
        webm_path = webm_tmp.name

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as wav_tmp:
        wav_path = wav_tmp.name

    try:
        # Intentar auto-detectar el formato (sin -f)
        cmd = [
            "ffmpeg",
            "-i", webm_path,
            "-acodec", "pcm_s16le",
            "-ac", "1",
            "-ar", "16000",
            "-y",
            wav_path,
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
        if result.returncode != 0:
            raise RuntimeError(f"ffmpeg failed: {result.stderr.strip()[-300:]}")
        with open(wav_path, "rb") as f:
            wav_data = f.read()
        if len(wav_data) == 0:
            raise RuntimeError("ffmpeg produced empty WAV")
        return wav_data
    finally:
        for p in [webm_path, wav_path]:
            try:
                os.unlink(p)
            except OSError:
                pass


def convert_webm_accumulated_to_wav(audio_chunks: list[bytes]) -> bytes:
    """Concatena múltiples chunks WebM y los convierte a WAV."""
    if not audio_chunks:
        raise ValueError("No audio chunks to convert")
    combined = b"".join(audio_chunks)
    return convert_webm_bytes_to_wav(combined)


def cleanup_chunk(filepath: str):
    try:
        if os.path.exists(filepath):
            os.remove(filepath)
    except OSError:
        pass