"use client";

import { useEffect, useRef } from "react";
import { useConsultaStore } from "@/stores/useConsultaStore";
import type { TranscriptionItem } from "@/stores/useConsultaStore";
import { cn } from "@/lib/cn";

export function ChatBubble({ item }: { item: TranscriptionItem }) {
  const isDoctor = item.speaker === "doctor";

  return (
    <div className={cn("flex mb-3", isDoctor ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2 text-sm leading-relaxed shadow-sm",
          isDoctor
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-secondary text-secondary-foreground rounded-bl-md"
        )}
      >
        <p>{item.text}</p>
        <p className={cn("text-[10px] mt-1 opacity-70", isDoctor ? "text-right" : "text-left")}>
          {new Date(item.timestamp).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </div>
  );
}

export function ChatPanel() {
  const transcription = useConsultaStore((s) => s.transcription);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcription.length]);

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto p-4 space-y-1 scroll-smooth"
    >
      {transcription.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <p className="text-sm text-muted-foreground">
            La transcripción aparecerá aquí en tiempo real...
          </p>
        </div>
      ) : (
        transcription.map((item) => (
          <ChatBubble key={item.id} item={item} />
        ))
      )}
    </div>
  );
}
