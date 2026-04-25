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
    import ffmpeg
    import tempfile

    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as webm_tmp:
        webm_tmp.write(audio_bytes)
        webm_path = webm_tmp.name

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as wav_tmp:
        wav_path = wav_tmp.name

    try:
        (
            ffmpeg
            .input(webm_path)
            .output(wav_path, format="wav", acodec="pcm_s16le", ac=1, ar="16000")
            .overwrite_output()
            .run(quiet=True)
        )
        with open(wav_path, "rb") as f:
            wav_data = f.read()
        return wav_data
    finally:
        os.unlink(webm_path)
        os.unlink(wav_path)


def cleanup_chunk(filepath: str):
    try:
        if os.path.exists(filepath):
            os.remove(filepath)
    except OSError:
        pass