"use client";

import { useState, useEffect } from "react";
import { X, Pencil, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getApiUrl } from "@/lib/utils";
import { cn } from "@/lib/cn";
import type { Paciente } from "@/types";

interface FichaPacienteSlideOverProps {
  pacienteId: string;
  open: boolean;
  onClose: () => void;
}

export function FichaPacienteSlideOver({ pacienteId, open, onClose }: FichaPacienteSlideOverProps) {
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !pacienteId) return;

    const token = localStorage.getItem("access_token");
    if (!token) return;

    async function fetchPaciente() {
      setLoading(true);
      try {
        const res = await fetch(`${getApiUrl()}/api/v1/pacientes/${pacienteId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data: Paciente = await res.json();
          setPaciente(data);
          setEditData({
            alergias: data.alergias?.join(", ") || "",
            antecedentes_ginecologicos: data.antecedentes_ginecologicos || "",
            notas: data.notas || "",
          });
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }

    fetchPaciente();
  }, [open, pacienteId]);

  function handleEditToggle() {
    if (editMode && paciente) {
      setEditData({
        alergias: paciente.alergias?.join(", ") || "",
        antecedentes_ginecologicos: paciente.antecedentes_ginecologicos || "",
        notas: paciente.notas || "",
      });
    }
    setEditMode(!editMode);
  }

  function handleSave() {
    // Placeholder: en producción guardaría al backend
    setEditMode(false);
    if (paciente) {
      setPaciente({
        ...paciente,
        alergias: editData.alergias.split(",").map((s) => s.trim()).filter(Boolean),
        antecedentes_ginecologicos: editData.antecedentes_ginecologicos,
        notas: editData.notas,
      });
    }
  }

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-96 bg-card border-l z-50 shadow-xl flex flex-col">
        {/* Header */}
        <div className="h-14 border-b flex items-center justify-between px-4 shrink-0">
          <h2 className="font-semibold text-sm">Ficha Completa</h2>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={handleEditToggle}>
              {editMode ? <Save className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : paciente ? (
            <>
              {/* Datos básicos */}
              <section>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Datos Generales
                </h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Nombre:</span>{" "}
                    <span className="font-medium">{paciente.nombre} {paciente.apellidos}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Nacimiento:</span>{" "}
                    {new Date(paciente.fecha_nacimiento).toLocaleDateString("es-ES")}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Teléfono:</span>{" "}
                    {paciente.telefono || "—"}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email:</span>{" "}
                    {paciente.email || "—"}
                  </div>
                </div>
              </section>

              {/* Alergias */}
              <section>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Alergias
                </h3>
                {editMode ? (
                  <Input
                    value={editData.alergias}
                    onChange={(e) => setEditData({ ...editData, alergias: e.target.value })}
                    className={cn("text-sm bg-blue-50/40")}
                    placeholder="Separar por comas"
                  />
                ) : (
                  <p className="text-sm">
                    {paciente.alergias?.length ? (
                      <span className="text-destructive font-medium">
                        {paciente.alergias.join(", ")}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Ninguna conocida</span>
                    )}
                  </p>
                )}
              </section>

              {/* Antecedentes */}
              <section>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Antecedentes Ginecológicos
                </h3>
                {editMode ? (
                  <textarea
                    value={editData.antecedentes_ginecologicos}
                    onChange={(e) => setEditData({ ...editData, antecedentes_ginecologicos: e.target.value })}
                    className={cn(
                      "w-full min-h-[80px] rounded-md border px-3 py-2 text-sm bg-blue-50/40",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    )}
                  />
                ) : (
                  <p className="text-sm">
                    {paciente.antecedentes_ginecologicos || (
                      <span className="text-muted-foreground">No registrados</span>
                    )}
                  </p>
                )}
              </section>

              {/* Notas */}
              <section>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Notas
                </h3>
                {editMode ? (
                  <textarea
                    value={editData.notas}
                    onChange={(e) => setEditData({ ...editData, notas: e.target.value })}
                    className={cn(
                      "w-full min-h-[60px] rounded-md border px-3 py-2 text-sm bg-blue-50/40",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    )}
                  />
                ) : (
                  <p className="text-sm">
                    {paciente.notas || (
                      <span className="text-muted-foreground">Sin notas</span>
                    )}
                  </p>
                )}
              </section>

              {editMode && (
                <Button size="sm" className="w-full" onClick={handleSave}>
                  Guardar Cambios
                </Button>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Paciente no encontrado</p>
          )}
        </div>
      </div>
    </>
  );
}
