"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Page, Card, Input, Button } from "@/components/ui";
import Link from "next/link";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setUserEmail(data.user?.email ?? null);
    })();
  }, []);

  async function signUp() {
    setMsg(null);
    const { error } = await supabase.auth.signUp({ email, password: pass });
    setMsg(error ? error.message : "Cuenta creada. Si hay confirmación por correo, revisa tu email.");
  }

  async function signIn() {
    setMsg(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) return setMsg(error.message);

    const { data } = await supabase.auth.getUser();
    setUserEmail(data.user?.email ?? null);
    setMsg("Listo, sesión iniciada.");
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUserEmail(null);
    setMsg("Sesión cerrada.");
  }

  return (
    <Page>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Auth</h1>
        <Link href="/"><Button>Inicio</Button></Link>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Card>
          <div className="text-sm text-gray-300">Sesión: {userEmail ?? "—"}</div>

          <div className="mt-4 space-y-3">
            <div>
              <div className="text-sm mb-1">Email</div>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" />
            </div>

            <div>
              <div className="text-sm mb-1">Contraseña</div>
              <Input type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="••••••••" />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={signUp}>Crear cuenta</Button>
              <Button onClick={signIn}>Iniciar sesión</Button>
              <Button onClick={signOut}>Cerrar sesión</Button>
              <Link href="/dashboard"><Button>Dashboard</Button></Link>
            </div>

            {msg && <div className="text-sm text-gray-200/90">{msg}</div>}
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold">Tip</h2>
          <p className="mt-2 text-sm text-gray-300">
            Si te estorba la confirmación por correo para pruebas, desactívala en Supabase Auth Settings.
          </p>
        </Card>
      </div>
    </Page>
  );
}
