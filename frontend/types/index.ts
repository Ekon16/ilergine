export interface User {
  id: string;
  email: string;
  nombre: string;
  especialidad: string | null;
}

export interface Paciente {
  id: string;
  nombre: string;
  apellidos: string;
  fecha_nacimiento: string;
  telefono: string | null;
  email: string | null;
  alergias: string[] | null;
  antecedentes_ginecologicos: string | null;
  notas: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  usuario: User;
}

export interface WSMessage {
  type: "transcription" | "insights" | "status" | "finalizado" | "error";
  text?: string;
  speaker?: string;
  timestamp?: string;
  data?: unknown;
  status?: string;
  message?: string;
  paciente?: string;
  resumen?: {
    recetas: number;
    volantes: number;
    pruebas: number;
  };
}
