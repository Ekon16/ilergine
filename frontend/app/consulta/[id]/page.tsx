"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { MessageSquare, Brain, Mic } from "lucide-react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useAudioCapture } from "@/hooks/useAudioCapture";
import { useConsultaStore } from "@/stores/useConsultaStore";
import { ConsultaHeader } from "@/components/chat/consulta-header";
import { ChatPanel } from "@/components/chat/chat-panel";
import { InsightsPanel } from "@/components/insights/insights-panel";
import { FinalizarDialog } from "@/components/insights/finalizar-dialog";
import { FichaPacienteSlideOver } from "@/components/paciente/ficha-slideover";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";

export default function ConsultaPage() {
  const router = useRouter();
  const params = useParams();
  const pacienteId = params.id as string;

  const [token, setToken] = useState("");
  const [showFinalizar, setShowFinalizar] = useState(false);
  const [showFicha, setShowFicha] = useState(false);
  const [finalizado, setFinalizado] = useState(false);

  const status = useConsultaStore((s) => s.status);
  const reset = useConsultaStore((s) => s.reset);

  useEffect(() => {
    const stored = localStorage.getItem("access_token");
    if (!stored) {
      router.push("/login");
      return;
    }
    setToken(stored);
    reset();
  }, []);

  const { send, sendBinary } = useWebSocket({ pacienteId, token: token || "" });

  const [micAccepted, setMicAccepted] = useState(false);

  const handleAudioChunk = useCallback(
    (blob: Blob) => {
      sendBinary(blob);
    },
    [sendBinary]
  );

  const { isRecording, toggle: toggleMic, error: micError, start: startMic } = useAudioCapture({
    onChunk: handleAudioChunk,
  });

  const handleActivateMic = useCallback(async () => {
    await startMic();
    setMicAccepted(true);
  }, [startMic]);

  // Auto-iniciar micrófono cuando el WebSocket conecte Y el usuario ya aceptó
  useEffect(() => {
    if (status === "listening" && micAccepted && !isRecording) {
      startMic();
    }
  }, [status, micAccepted, isRecording, startMic]);

  const handleFinalizar = useCallback(() => {
    send({ type: "finalizar" });
    setFinalizado(true);
    setShowFinalizar(false);
  }, [send]);

  const handlePedirFinalizar = useCallback(() => {
    setShowFinalizar(true);
  }, []);

  // Escuchar mensaje de finalizado para mostrar modal
  useEffect(() => {
    const unsub = useConsultaStore.subscribe((state) => {
      if (state.resumenFinalizado && !showFinalizar && !finalizado) {
        setShowFinalizar(true);
      }
    });
    return unsub;
  }, [showFinalizar, finalizado]);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!micAccepted && !finalizado) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/40">
        <div className="text-center space-y-6 p-8 max-w-md">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Mic className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold">Activar Micrófono</h2>
          <p className="text-muted-foreground">
            Para transcribir la consulta en tiempo real, necesitas activar el micrófono.
          </p>
          {micError && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
              {micError}
            </p>
          )}
          <Button size="lg" onClick={handleActivateMic}>
            Activar Micrófono
          </Button>
          <p className="text-xs text-muted-foreground">
            El navegador te pedirá permiso para usar el micrófono.
          </p>
        </div>
      </div>
    );
  }

  if (finalizado) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/40">
        <div className="text-center space-y-4 p-8">
          <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
            <MessageSquare className="h-6 w-6 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold">Consulta Finalizada</h2>
          <p className="text-muted-foreground">
            La transcripción y los insights se han guardado correctamente.
          </p>
          <button
            className="text-sm text-primary hover:underline"
            onClick={() => router.push("/consulta")}
          >
            Volver al listado de pacientes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <ConsultaHeader
        onFinalizar={handlePedirFinalizar}
        onOpenFicha={() => setShowFicha(true)}
        onToggleMic={toggleMic}
      />

      {micError && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-sm text-amber-800">
          {micError}.{micError.includes("HTTPS") ? "" : " ¿Aceptaste el permiso de micrófono?"}
        </div>
      )}

      <div className="flex flex-1 min-h-0">
        {/* Panel Izquierdo: 60% Chat */}
        <div className="w-[60%] flex flex-col border-r min-w-0">
          <div className="h-8 border-b bg-muted/30 flex items-center px-4 shrink-0">
            <MessageSquare className="h-3.5 w-3.5 text-muted-foreground mr-2" />
            <span className="text-xs text-muted-foreground font-medium">
              Transcripción en tiempo real
            </span>
          </div>
          <ChatPanel />
        </div>

        {/* Panel Derecho: 40% Insights */}
        <div className="w-[40%] flex flex-col min-w-0">
          <div className="h-8 border-b bg-muted/30 flex items-center px-4 shrink-0">
            <Brain className="h-3.5 w-3.5 text-muted-foreground mr-2" />
            <span className="text-xs text-muted-foreground font-medium">
              Insights IA
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <InsightsPanel />
          </div>
        </div>
      </div>

      <FinalizarDialog
        open={showFinalizar}
        onOpenChange={setShowFinalizar}
        onConfirm={handleFinalizar}
      />

      <FichaPacienteSlideOver
        pacienteId={pacienteId}
        open={showFicha}
        onClose={() => setShowFicha(false)}
      />
    </div>
  );
}
