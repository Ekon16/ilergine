import { create } from "zustand";

export interface TranscriptionItem {
  id: string;
  text: string;
  speaker: "doctor" | "paciente";
  timestamp: string;
}

export interface ChecklistItem {
  tipo: "receta" | "volante" | "prueba";
  detalle: string;
  completado: boolean;
}

export interface Insights {
  checklist_tareas: ChecklistItem[];
  rapport_personal: string[];
  sugerencias_vivo: string[];
}

export interface ResumenFinalizado {
  recetas: number;
  volantes: number;
  pruebas: number;
}

export type ConnectionStatus =
  | "disconnected"
  | "connecting"
  | "listening"
  | "reconnecting"
  | "error";

interface ConsultaState {
  // Conexión
  status: ConnectionStatus;
  setStatus: (status: ConnectionStatus) => void;

  // Transcripción
  transcription: TranscriptionItem[];
  addTranscription: (item: TranscriptionItem) => void;

  // Insights
  insights: Insights | null;
  setInsights: (insights: Insights) => void;
  toggleChecklistItem: (index: number) => void;

  // Finalización
  resumenFinalizado: ResumenFinalizado | null;
  setResumenFinalizado: (resumen: ResumenFinalizado) => void;

  // Paciente
  pacienteNombre: string;
  setPacienteNombre: (nombre: string) => void;

  // Error
  error: string | null;
  setError: (error: string | null) => void;

  // Limpiar
  reset: () => void;
}

const initialState = {
  status: "disconnected" as ConnectionStatus,
  transcription: [],
  insights: null,
  resumenFinalizado: null,
  pacienteNombre: "",
  error: null,
};

export const useConsultaStore = create<ConsultaState>((set) => ({
  ...initialState,

  setStatus: (status) => set({ status }),

  addTranscription: (item) =>
    set((state) => ({
      transcription: [...state.transcription, item],
    })),

  setInsights: (insights) => set({ insights }),

  toggleChecklistItem: (index) =>
    set((state) => {
      if (!state.insights) return state;
      if (index < 0 || index >= state.insights.checklist_tareas.length) return state;
      const updated = [...state.insights.checklist_tareas];
      updated[index] = {
        ...updated[index],
        completado: !updated[index].completado,
      };
      return {
        insights: {
          ...state.insights,
          checklist_tareas: updated,
        },
      };
    }),

  setResumenFinalizado: (resumen) => set({ resumenFinalizado: resumen }),

  setPacienteNombre: (nombre) => set({ pacienteNombre: nombre }),

  setError: (error) => set({ error }),

  reset: () => set({ ...initialState }),
}));
