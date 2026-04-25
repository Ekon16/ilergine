"use client";

import { Check, FileText, ClipboardCheck, Lightbulb } from "lucide-react";
import { useConsultaStore } from "@/stores/useConsultaStore";

export function InsightsPanel() {
  const insights = useConsultaStore((s) => s.insights);
  const toggleItem = useConsultaStore((s) => s.toggleChecklistItem);

  if (!insights) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-muted-foreground text-center px-4">
          Esperando análisis de IA...
          <br />
          Los insights aparecerán aquí conforme avance la consulta.
        </p>
      </div>
    );
  }

  const { checklist_tareas, sugerencias_vivo, rapport_personal } = insights;

  return (
    <div className="space-y-5">
      {/* Checklist */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <ClipboardCheck className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Checklist de Tareas</h3>
        </div>
        {checklist_tareas.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sin tareas detectadas</p>
        ) : (
          <ul className="space-y-1.5">
            {checklist_tareas.map((item, i) => (
              <li key={i}>
                <button
                  className="w-full flex items-start gap-2 text-left p-2 rounded-md hover:bg-accent transition-colors"
                  onClick={() => toggleItem(i)}
                >
                  <span
                    className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center text-[10px] transition-colors ${
                      item.completado
                        ? "bg-emerald-500 border-emerald-500 text-white"
                        : "border-muted-foreground/30"
                    }`}
                  >
                    {item.completado && <Check className="h-3 w-3" />}
                  </span>
                  <span className="flex-1">
                    <span
                      className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded mr-1.5 capitalize ${
                        item.tipo === "receta"
                          ? "bg-blue-100 text-blue-700"
                          : item.tipo === "volante"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {item.tipo}
                    </span>
                    <span className={`text-xs ${item.completado ? "line-through text-muted-foreground" : ""}`}>
                      {item.detalle}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Sugerencias */}
      {sugerencias_vivo.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-semibold">Sugerencias Clínicas</h3>
          </div>
          <ul className="space-y-1.5">
            {sugerencias_vivo.map((s, i) => (
              <li key={i} className="text-xs text-muted-foreground bg-amber-50 border border-amber-200 rounded-md p-2">
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Rapport Personal (oculto por defecto con acordeón) */}
      {rapport_personal.length > 0 && (
        <div className="border rounded-md">
          <details className="[&>summary]:list-none">
            <summary className="flex items-center gap-2 p-2 cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors select-none">
              <svg className="h-3 w-3 transition-transform duration-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
              Datos de Rapport ({rapport_personal.length})
            </summary>
            <ul className="px-4 pb-2 space-y-1">
              {rapport_personal.map((item, i) => (
                <li key={i} className="text-xs text-muted-foreground">· {item}</li>
              ))}
            </ul>
          </details>
        </div>
      )}
    </div>
  );
}
