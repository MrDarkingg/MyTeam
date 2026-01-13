"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { Page, Card, Button } from "@/components/ui";

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setUserEmail(data.user?.email ?? null);
      setLoading(false);
    })();
  }, []);

  return (
    <Page>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">MyTask</h1>
        <div className="text-sm text-gray-300">
          {loading ? "Cargando..." : userEmail ? `Sesión: ${userEmail}` : "Sin sesión"}
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold">Entrar</h2>
          <p className="mt-1 text-sm text-gray-300">
            Crea cuenta / inicia sesión para ver tus equipos.
          </p>

          <div className="mt-4 flex gap-2">
            <Link href="/auth">
              <Button>Ir a Auth</Button>
            </Link>
            <Link href="/dashboard">
              <Button>Ir a Dashboard</Button>
            </Link>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold">Cómo funciona</h2>
          <ul className="mt-2 list-disc pl-5 text-sm text-gray-300">
            <li>El líder crea un Team con nombre + contraseña.</li>
            <li>Los asesores se unen con esa clave.</li>
            <li>El líder asigna tareas por asesor.</li>
            <li>El asesor solo marca completada / no completada con motivo.</li>
          </ul>
        </Card>
      </div>
    </Page>
  );
}
