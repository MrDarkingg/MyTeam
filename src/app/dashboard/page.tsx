"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Page, Card, Input, Button } from "@/components/ui";
import Link from "next/link";

type TeamRow = {
  team_id: string;
  role: "leader" | "advisor";
  joined_at: string;
  teams: { id: string; name: string; created_at: string } | null;
};

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<TeamRow[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newPass, setNewPass] = useState("");

  const [joinName, setJoinName] = useState("");
  const [joinPass, setJoinPass] = useState("");

  const teams = useMemo(() => {
    return items
      .filter((x) => x.teams)
      .map((x) => ({
        teamId: x.team_id,
        name: x.teams!.name,
        role: x.role,
      }));
  }, [items]);

  async function load() {
    setMsg(null);
    setLoading(true);

    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id ?? null;
    setUserId(uid);

    if (!uid) {
      setItems([]);
      setLoading(false);
      setMsg("No hay sesión. Ve a /auth.");
      return;
    }

    const { data, error } = await supabase
      .from("team_members")
      .select("team_id, role, joined_at, teams(id,name,created_at)")
      .eq("user_id", uid)
      .order("joined_at", { ascending: false });

    if (error) setMsg(error.message);
    setItems((data as any) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function createTeam() {
    setMsg(null);
    const { error } = await supabase.rpc("create_team", {
      p_name: newName,
      p_password: newPass,
    });

    if (error) return setMsg(error.message);

    setMsg("Equipo creado ✅");
    setNewName("");
    setNewPass("");
    await load();
  }

  async function joinTeam() {
    setMsg(null);
    const { error } = await supabase.rpc("join_team", {
      p_name: joinName,
      p_password: joinPass,
    });

    if (error) return setMsg(error.message);

    setMsg("Te uniste al equipo ✅");
    setJoinName("");
    setJoinPass("");
    await load();
  }

  return (
    <Page>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <div className="flex gap-2">
          <Link href="/"><Button>Inicio</Button></Link>
          <Link href="/auth"><Button>Auth</Button></Link>
          <Button onClick={load}>Refrescar</Button>
        </div>
      </div>

      <div className="mt-2 text-sm text-gray-300">
        {loading ? "Cargando..." : userId ? `UserID: ${userId}` : "Sin sesión"}
      </div>

      {msg && <div className="mt-3 text-sm">{msg}</div>}

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold">Crear Team (Líder)</h2>
          <div className="mt-3 space-y-3">
            <div>
              <div className="text-sm mb-1">Nombre</div>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ej: Ventas Zona 1" />
            </div>
            <div>
              <div className="text-sm mb-1">Contraseña</div>
              <Input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} placeholder="Mín 4" />
            </div>
            <Button onClick={createTeam} disabled={!newName.trim() || newPass.length < 4}>
              Crear
            </Button>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold">Unirme a Team (Asesor)</h2>
          <div className="mt-3 space-y-3">
            <div>
              <div className="text-sm mb-1">Nombre del Team</div>
              <Input value={joinName} onChange={(e) => setJoinName(e.target.value)} placeholder="Tal cual lo puso el líder" />
            </div>
            <div>
              <div className="text-sm mb-1">Contraseña</div>
              <Input type="password" value={joinPass} onChange={(e) => setJoinPass(e.target.value)} placeholder="La que te dieron" />
            </div>
            <Button onClick={joinTeam} disabled={!joinName.trim() || joinPass.length < 4}>
              Unirme
            </Button>
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="text-lg font-semibold">Mis Teams</h2>
        <div className="mt-3 space-y-2">
          {teams.length === 0 && <div className="text-sm text-gray-300">No tienes equipos todavía.</div>}
          {teams.map((t) => (
            <div key={t.teamId} className="flex items-center justify-between gap-2 rounded-xl bg-white/5 p-3">
              <div>
                <div className="font-medium">{t.name}</div>
                <div className="text-xs text-gray-300">Rol: {t.role}</div>
              </div>
              <Link href={`/team/${t.teamId}`}>
                <Button>Entrar</Button>
              </Link>
            </div>
          ))}
        </div>
      </Card>
    </Page>
  );
}
