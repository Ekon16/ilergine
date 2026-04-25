export function getApiUrl(): string {
  if (typeof window !== "undefined") {
    return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";
  }
  return "http://backend:8000";
}

export function getWsUrl(pacienteId: string, token: string): string {
  const apiUrl = getApiUrl().replace("http", "ws");
  return `${apiUrl}/api/v1/consultas/live/${pacienteId}?token=${token}`;
}

export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTime(date: Date | string): string {
  return new Date(date).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
