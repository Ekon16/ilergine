"use client";

import { useState, useCallback } from "react";
import { Mic, MicOff, LogOut, FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { useConsultaStore } from "@/stores/useConsultaStore";

interface ConsultaHeaderProps {
  onFinalizar: () => void;
  onToggleMic?: () => void;
  onOpenFicha: () => void;
}

export function ConsultaHeader({ onFinalizar, onToggleMic, onOpenFicha }: ConsultaHeaderProps) {
  const router = useRouter();
  const status = useConsultaStore((s) => s.status);
  const pacienteNombre = useConsultaStore((s) => s.pacienteNombre);
  const [micMuted, setMicMuted] = useState(false);

  const handleToggleMic = useCallback(() => {
    setMicMuted((prev) => !prev);
    onToggleMic?.();
  }, [onToggleMic]);

  function handleLogout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("usuario");
    router.push("/login");
  }

  return (
    <header className="h-14 border-b bg-card flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-4">
        <h1 className="font-bold text-lg text-primary">Ilergine</h1>
        {pacienteNombre && (
          <span className="text-sm text-muted-foreground">· {pacienteNombre}</span>
        )}
        <div className="flex items-center gap-2 ml-4 text-xs text-muted-foreground">
          <span>Peso: -- kg</span>
          <span>·</span>
          <span>Tensión: --/--</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <StatusBadge status={status} />

        <Button
          variant="ghost"
          size="icon"
          onClick={handleToggleMic}
          title={micMuted ? "Activar micrófono" : "Silenciar micrófono"}
        >
          {micMuted ? (
            <MicOff className="h-4 w-4 text-destructive" />
          ) : (
            <Mic className="h-4 w-4 text-emerald-500" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenFicha}
          title="Ver Ficha Completa"
        >
          <FileText className="h-4 w-4" />
        </Button>

        <Button variant="outline" size="sm" onClick={onFinalizar}>
          Finalizar
        </Button>

        <Button variant="ghost" size="icon" onClick={handleLogout} title="Cerrar sesión">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
