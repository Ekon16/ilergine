import asyncio
from functools import lru_cache
from core.config import settings


class WhisperService:
    def __init__(self):
        self._model = None

    async def _load_model(self):
        if self._model is None:
            try:
                from faster_whisper import WhisperModel
                loop = asyncio.get_event_loop()
                self._model = await loop.run_in_executor(
                    None,
                    lambda: WhisperModel(
                        settings.WHISPER_MODEL,
                        device="cpu",
                        compute_type="int8",
                    ),
                )
            except Exception:
                from faster_whisper import WhisperModel
                loop = asyncio.get_event_loop()
                self._model = await loop.run_in_executor(
                    None,
                    lambda: WhisperModel(settings.WHISPER_MODEL),
                )

    async def transcribe(self, wav_bytes: bytes) -> str:
        await self._load_model()
        import tempfile
        import os

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp.write(wav_bytes)
            tmp.flush()
            tmp_path = tmp.name

        try:
            loop = asyncio.get_event_loop()

            def _transcribe():
                segments, _ = self._model.transcribe(
                    tmp_path,
                    language=settings.WHISPER_LANGUAGE,
                    beam_size=5,
                )
                return " ".join(segment.text.strip() for segment in segments)

            result = await loop.run_in_executor(None, _transcribe)
            return result
        finally:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass


@lru_cache
def get_whisper() -> WhisperService:
    return WhisperService()
