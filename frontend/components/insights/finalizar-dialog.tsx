"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useConsultaStore } from "@/stores/useConsultaStore";
import { ClipboardCheck, FileText, FlaskConical } from "lucide-react";

interface FinalizarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function FinalizarDialog({ open, onOpenChange, onConfirm }: FinalizarDialogProps) {
  const resumenFinalizado = useConsultaStore((s) => s.resumenFinalizado);

  if (!resumenFinalizado) return null;

  const { recetas, volantes, pruebas } = resumenFinalizado;
  const partes: string[] = [];
  if (recetas > 0) partes.push(`${recetas} Receta${recetas > 1 ? "s" : ""}`);
  if (volantes > 0) partes.push(`${volantes} Volante${volantes > 1 ? "s" : ""}`);
  if (pruebas > 0) partes.push(`${pruebas} Prueba${pruebas > 1 ? "s" : ""}`);

  const resumenTexto = partes.length > 0 ? partes.join(", ") : "Sin tareas pendientes";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Finalizar Consulta</DialogTitle>
          <DialogDescription>
            Revise el resumen antes de confirmar. La transcripción completa se guardará en el historial del paciente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm font-medium">Resumen detectado por IA:</p>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
              <FileText className="h-5 w-5 text-blue-600 mx-auto mb-1" />
              <p className="text-lg font-bold text-blue-700">{recetas}</p>
              <p className="text-[10px] text-blue-600">Recetas</p>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-center">
              <FileText className="h-5 w-5 text-purple-600 mx-auto mb-1" />
              <p className="text-lg font-bold text-purple-700">{volantes}</p>
              <p className="text-[10px] text-purple-600">Volantes</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
              <FlaskConical className="h-5 w-5 text-amber-600 mx-auto mb-1" />
              <p className="text-lg font-bold text-amber-700">{pruebas}</p>
              <p className="text-[10px] text-amber-600">Pruebas</p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            {resumenTexto}. ¿Confirmar y guardar?
          </p>
        </div>

        <DialogFooter className="sm:justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={onConfirm}>
            Confirmar y Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
