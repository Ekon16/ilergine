"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { getApiUrl } from "@/lib/utils";
import type { TokenResponse } from "@/types";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("dr.garcia@clinica.es");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${getApiUrl()}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Credenciales inválidas");
      }

      const data: TokenResponse = await res.json();

      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("usuario", JSON.stringify(data.usuario));

      router.push("/consulta");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40">
      <div className="w-full max-w-md space-y-8 p-8 bg-card rounded-xl border shadow-sm">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-primary">Ilergine</h1>
          <p className="mt-2 text-sm text-muted-foreground">ERP Médico · Consulta Ginecológica</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="usuario@clinica.es"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Spinner size={16} className="mr-2" /> : null}
            Acceder
          </Button>
        </form>

        <p className="text-[11px] text-muted-foreground text-center">
          Entorno On-Premise · RGPD Compliant · Datos locales
        </p>
      </div>
    </div>
  );
}
