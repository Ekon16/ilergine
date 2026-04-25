import type { Metadata } from "next";
import "@/app/globals.css";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: "Ilergine · ERP Médico",
  description: "Inteligencia Clínica Ambiental para Consulta Ginecológica",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🩺</text></svg>" />
      </head>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased"
        )}
      >
        {children}
      </body>
    </html>
  );
}
