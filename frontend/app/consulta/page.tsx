"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { getApiUrl } from "@/lib/utils";
import type { Paciente } from "@/types";

export default function ConsultaIndexPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [search, setSearch] = useState("");
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("access_token");
    if (!stored) {
      router.push("/login");
      return;
    }
    setToken(stored);
  }, [router]);

  async function handleSearch() {
    if (!search.trim() || !token) return;
    setLoading(true);
    try {
      const res = await fetch(`${getApiUrl()}/api/v1/pacientes/search/${encodeURIComponent(search)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data: Paciente[] = await res.json();
        setPacientes(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  function startConsulta(pacienteId: string) {
    router.push(`/consulta/${pacienteId}`);
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/40 p-8">
      <div className="mx-auto max-w-2xl space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-primary">Ilergine</h1>
          <p className="mt-2 text-muted-foreground">Seleccione un paciente para iniciar consulta</p>
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Buscar paciente por nombre o apellido..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Button onClick={handleSearch} disabled={loading}>
            Buscar
          </Button>
        </div>

        <div className="space-y-2">
          {pacientes.map((p) => (
            <button
              key={p.id}
              className="w-full text-left p-4 bg-card border rounded-lg hover:border-primary transition-colors"
              onClick={() => startConsulta(p.id)}
            >
              <p className="font-medium">{p.nombre} {p.apellidos}</p>
              <p className="text-sm text-muted-foreground">
                Nacimiento: {new Date(p.fecha_nacimiento).toLocaleDateString("es-ES")}
                {p.alergias && p.alergias.length > 0 && (
                  <> · Alergias: {p.alergias.join(", ")}</>
                )}
              </p>
            </button>
          ))}
          {!loading && pacientes.length === 0 && search && (
            <p className="text-sm text-muted-foreground text-center py-4">Sin resultados</p>
          )}
        </div>
      </div>
    </div>
  );
}
