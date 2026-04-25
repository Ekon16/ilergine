"use client";

import { cn } from "@/lib/cn";

interface StatusBadgeProps {
  status: "listening" | "reconnecting" | "disconnected" | "connecting" | "error";
  className?: string;
}

const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
  listening: {
    label: "IA Escuchando",
    color: "bg-emerald-100 text-emerald-800 border-emerald-200",
    dot: "bg-emerald-500",
  },
  reconnecting: {
    label: "Reconectando...",
    color: "bg-amber-100 text-amber-800 border-amber-200",
    dot: "bg-amber-500 animate-pulse",
  },
  connecting: {
    label: "Conectando...",
    color: "bg-blue-100 text-blue-800 border-blue-200",
    dot: "bg-blue-500 animate-pulse",
  },
  disconnected: {
    label: "Desconectado",
    color: "bg-gray-100 text-gray-800 border-gray-200",
    dot: "bg-gray-500",
  },
  error: {
    label: "Error de conexión",
    color: "bg-red-100 text-red-800 border-red-200",
    dot: "bg-red-500",
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.disconnected;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-xs font-medium",
        config.color,
        className
      )}
    >
      <span className={cn("h-2 w-2 rounded-full", config.dot)} />
      {config.label}
    </span>
  );
}
