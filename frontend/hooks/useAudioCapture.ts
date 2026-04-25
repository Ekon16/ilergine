"use client";

import { useRef, useCallback, useState } from "react";

interface UseAudioCaptureOptions {
  onChunk: (base64Data: string) => void;
}

export function useAudioCapture({ onChunk }: UseAudioCaptureOptions) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(",")[1];
            if (base64) {
              onChunk(base64);
            }
          };
          reader.readAsDataURL(event.data);
        }
      };

      recorder.onerror = () => {
        setError("Error en la grabación de audio");
        stop();
      };

      recorder.start(1000);
      setIsRecording(true);
    } catch (err) {
      const message =
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Permiso de micrófono denegado"
          : "Error al acceder al micrófono";
      setError(message);
    }
  }, [onChunk]);

  const stop = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    setIsRecording(false);
  }, []);

  const toggle = useCallback(async () => {
    if (isRecording) {
      stop();
    } else {
      await start();
    }
  }, [isRecording, start, stop]);

  return {
    isRecording,
    error,
    start,
    stop,
    toggle,
  };
}
