"use client";

import { useEffect, useCallback, useRef } from "react";
import { useConsultaStore } from "@/stores/useConsultaStore";
import { getWsUrl } from "@/lib/utils";
import type { WSMessage } from "@/types";

function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback para navegadores antiguos
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

interface UseWebSocketOptions {
  pacienteId: string;
  token: string;
}

export function useWebSocket({ pacienteId, token }: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 10;

  const {
    setStatus,
    addTranscription,
    setInsights,
    setResumenFinalizado,
    setPacienteNombre,
    setError,
  } = useConsultaStore();

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    if (wsRef.current?.readyState === WebSocket.CONNECTING) return;

    const url = getWsUrl(pacienteId, token);
    setStatus("connecting");

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        reconnectAttemptsRef.current = 0;
        setStatus("listening");
      };

      ws.onmessage = (event) => {
        try {
          const msg: WSMessage = JSON.parse(event.data);

          switch (msg.type) {
            case "status":
              if (msg.paciente) {
                setPacienteNombre(msg.paciente);
              }
              if (msg.status === "listening") {
                setStatus("listening");
              }
              break;

            case "transcription":
              if (msg.text && msg.timestamp) {
                addTranscription({
                  id: generateId(),
                  text: msg.text,
                  speaker: (msg.speaker as "doctor" | "paciente") || "doctor",
                  timestamp: msg.timestamp,
                });
              }
              break;

            case "insights":
              if (msg.data) {
                setInsights(msg.data as Parameters<typeof setInsights>[0]);
              }
              break;

            case "finalizado":
              if (msg.resumen) {
                setResumenFinalizado(msg.resumen);
              }
              if (msg.data) {
                setInsights(msg.data as Parameters<typeof setInsights>[0]);
              }
              break;

            case "error":
              setError(msg.message || "Error desconocido");
              break;
          }
        } catch {
          // Ignorar mensajes mal formados
        }
      };

      ws.onclose = () => {
        const currentStatus = useConsultaStore.getState().status;
        if (currentStatus !== "disconnected") {
          setStatus("reconnecting");
          scheduleReconnect();
        }
      };

      ws.onerror = () => {
        setError("Error de conexión WebSocket");
      };
    } catch {
      setStatus("error");
      scheduleReconnect();
    }
  }, [pacienteId, token]);

  const scheduleReconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      setStatus("error");
      return;
    }

    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectAttemptsRef.current += 1;
      connect();
    }, Math.min(1000 * 2 ** reconnectAttemptsRef.current, 30000));
  }, [connect]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close(1000, "Desconexión manual");
      wsRef.current = null;
    }
    setStatus("disconnected");
  }, []);

  useEffect(() => {
    if (!token) return;
    connect();
    return () => disconnect();
  }, [connect, disconnect, token]);

  const send = useCallback((data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  return { send, disconnect };
}
