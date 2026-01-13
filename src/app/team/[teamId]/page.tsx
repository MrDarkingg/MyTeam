"use client";

import { use, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Page, Card, Button, Input, Textarea } from "@/components/ui";
import Link from "next/link";

type Member = { user_id: string; role: "leader" | "advisor"; joined_at: string };
type TeamParams = { teamId: string };

type Task = {
  id: string;
  team_id: string;
  assigned_to: string;
  title: string;
  description: string | null;
  assigned_at: string;
  due_at: string;
  status: "pending" | "completed" | "not_completed";
  not_done_reason: string | null;
  completed_at: string | null;
  created_by: string;
};

export default function TeamPage({ params }: { params: Promise<TeamParams> }) {
  const { teamId } = use(params);

  const [myName, setMyName] = useState("");
const [myNameSaved, setMyNameSaved] = useState<string | null>(null);
const [profiles, setProfiles] = useState<Record<string, string>>({});

const [showCreateTask, setShowCreateTask] = useState(false);


  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [me, setMe] = useState<{ id: string; email: string | null } | null>(null);
  const [teamName, setTeamName] = useState<string>("");

  const [members, setMembers] = useState<Member[]>([]);
  const [role, setRole] = useState<"leader" | "advisor" | null>(null);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [filterAssignedTo, setFilterAssignedTo] = useState<string>("all");

  // leader form
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskDue, setTaskDue] = useState(""); // datetime-local
  const [taskAssignee, setTaskAssignee] = useState("");

  // advisor reason modal
  const [reasonFor, setReasonFor] = useState<string | null>(null);
  const [reasonText, setReasonText] = useState("");

  const visibleTasks = useMemo(() => {
    if (filterAssignedTo === "all") return tasks;
    return tasks.filter((t) => t.assigned_to === filterAssignedTo);
  }, [tasks, filterAssignedTo]);

  const progress = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === "completed").length;
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);
    return { total, done, pct };
  }, [tasks]);

  async function load() {
    setMsg(null);
    setLoading(true);

    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      setMsg("Sin sesión. Ve a /auth");
      setLoading(false);
      return;
    }
    setMe({ id: u.user.id, email: u.user.email ?? null });

    const { data: teamData, error: teamErr } = await supabase
      .from("teams")
      .select("name")
      .eq("id", teamId)
      .single();

    if (teamErr) {
      setMsg(teamErr.message);
      setLoading(false);
      return;
    }
    setTeamName(teamData?.name ?? "");

    const { data: memData, error: memErr } = await supabase
      .from("team_members")
      .select("user_id, role, joined_at")
      .eq("team_id", teamId)
      .order("joined_at", { ascending: true });

    if (memErr) {
      setMsg(memErr.message);
      setLoading(false);
      return;
    }

    setMembers((memData as any) ?? []);
    const myRole = (memData as any)?.find((m: any) => m.user_id === u.user!.id)?.role ?? null;
    setRole(myRole);

    const { data: taskData, error: taskErr } = await supabase
      .from("tasks")
      .select("*")
      .eq("team_id", teamId)
      .order("due_at", { ascending: true });

    if (taskErr) setMsg(taskErr.message);
    setTasks((taskData as any) ?? []);

    if (!taskAssignee && memData && memData.length > 0) {
      const firstAdvisor = (memData as any).find((m: any) => m.role === "advisor") ?? (memData as any)[0];
      if (firstAdvisor) setTaskAssignee(firstAdvisor.user_id);
    }
    // 1) cargar mi perfil
const { data: myProf } = await supabase
  .from("profiles")
  .select("display_name")
  .eq("user_id", u.user.id)
  .maybeSingle();

setMyNameSaved(myProf?.display_name ?? null);
setMyName(myProf?.display_name ?? "");

// 2) cargar perfiles de miembros del team
const memberIds = (memData as any).map((m: any) => m.user_id);
const { data: profs } = await supabase
  .from("profiles")
  .select("user_id, display_name")
  .in("user_id", memberIds);

const map: Record<string, string> = {};
(profs ?? []).forEach((p: any) => (map[p.user_id] = p.display_name));
setProfiles(map);


    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  async function createTask() {
    setMsg(null);
    if (role !== "leader") return setMsg("Solo el líder puede crear tareas.");

    if (!taskTitle.trim()) return setMsg("Título requerido.");
    if (!taskDue) return setMsg("Fecha/hora de vencimiento requerida.");
    if (!taskAssignee) return setMsg("Selecciona asesor.");

    const dueAtIso = new Date(taskDue).toISOString();

    const { error } = await supabase.from("tasks").insert({
      team_id: teamId,
      assigned_to: taskAssignee,
      title: taskTitle.trim(),
      description: taskDesc.trim() ? taskDesc.trim() : null,
      due_at: dueAtIso,
      created_by: me!.id,
    });

    if (error) return setMsg(error.message);

    setTaskTitle("");
    setTaskDesc("");
    setTaskDue("");
    await load();
setShowCreateTask(false);

  }

  async function deleteTask(taskId: string) {
    setMsg(null);
    if (role !== "leader") return setMsg("Solo el líder puede eliminar.");

    const { error } = await supabase.from("tasks").delete().eq("id", taskId);
    if (error) return setMsg(error.message);
    await load();
  }

  // ✅ ASESOR: ya no update directo, usa RPC
  async function toggleComplete(t: Task) {
    setMsg(null);
    const next = t.status === "completed" ? "pending" : "completed";

    const { error } = await supabase.rpc("set_task_status", {
      p_task_id: t.id,
      p_status: next,
      p_reason: null,
    });

    if (error) return setMsg(error.message);
    await load();
  }


  async function saveMyName() {
  setMsg(null);
  if (!me) return;
  const name = myName.trim();
  if (name.length < 2) return setMsg("Pon un nombre más largo.");

  const { error } = await supabase
    .from("profiles")
    .upsert({ user_id: me.id, display_name: name }, { onConflict: "user_id" });

  if (error) return setMsg(error.message);
  setMsg("Nombre guardado ✅");
  await load();
}

  // ✅ ASESOR: not_completed con motivo por RPC
  async function markNotCompleted(taskId: string) {
    setMsg(null);
    if (!reasonText.trim()) return setMsg("Motivo requerido.");

    const { error } = await supabase.rpc("set_task_status", {
      p_task_id: taskId,
      p_status: "not_completed",
      p_reason: reasonText.trim(),
    });

    if (error) return setMsg(error.message);

    setReasonFor(null);
    setReasonText("");
    await load();
  }

  function statusBadge(status: "pending" | "completed" | "not_completed") {
  if (status === "completed") {
    return {
      label: "Completada",
      icon: "✅",
      className:
        "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/30",
    };
  }
  if (status === "not_completed") {
    return {
      label: "No completada",
      icon: "⚠️",
      className:
        "bg-rose-500/15 text-rose-200 ring-1 ring-rose-500/30",
    };
  }
  return {
    label: "Pendiente",
    icon: "⏳",
    className:
      "bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/30",
  };
}


  return (
    <Page>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{teamName || "Team"}</h1>
          <div className="text-sm text-gray-300">Team ID: {teamId}</div>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard"><Button>Dashboard</Button></Link>
          <Button onClick={load}>Refrescar</Button>
        </div>
      </div>

      <div className="mt-2 text-sm text-gray-300">
        {loading ? "Cargando..." : `Rol: ${role ?? "—"} | Usuario: ${me?.email ?? me?.id ?? "—"}`}
      </div>

      {msg && <div className="mt-3 text-sm">{msg}</div>}

      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-lg font-semibold">Progreso del equipo</div>
            <div className="text-sm text-gray-300">
              Completadas: {progress.done} / {progress.total}
            </div>
          </div>
          <div className="text-2xl font-bold">{progress.pct}%</div>
        </div>

        <div className="mt-3 h-3 w-full rounded-full bg-white/10">
          <div className="h-3 rounded-full bg-white/40" style={{ width: `${progress.pct}%` }} />
        </div>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-semibold">Tareas</div>
            <div className="text-sm text-gray-300">
              Filtro: {filterAssignedTo === "all" ? "todas" : "por asesor"}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
  <Button onClick={() => setFilterAssignedTo("all")}>Todas</Button>

  {members.map((m) => (
    <Button
      key={m.user_id}
      onClick={() => setFilterAssignedTo(m.user_id)}
    >
      {(profiles[m.user_id] ?? m.user_id.slice(0, 6))} • {m.role}
    </Button>
  ))}
</div>

        </div>
      </Card>
      <Card>
  <h2 className="text-lg font-semibold">Mi nombre visible</h2>
  <div className="mt-3 grid gap-3 md:grid-cols-3">
    <div className="md:col-span-2">
      <Input value={myName} onChange={(e) => setMyName(e.target.value)} placeholder="Ej: Frank García" />
      <div className="mt-1 text-xs text-gray-300">
        Se verá para tu líder/asesores dentro de los teams.
      </div>
    </div>
    <div className="md:col-span-1">
      <Button onClick={saveMyName}>Guardar</Button>
    </div>
  </div>
  {myNameSaved && <div className="mt-2 text-sm text-gray-300">Actual: {myNameSaved}</div>}
</Card>

{role === "leader" && (
  <Card>
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-lg font-semibold">Tareas (Admin)</h2>
        <p className="text-sm text-gray-300">Crea tareas para tus asesores</p>
      </div>

      <Button onClick={() => setShowCreateTask((v) => !v)}>
        {showCreateTask ? "Cerrar" : "+ Nueva tarea"}
      </Button>
    </div>
  </Card>
)}


      {role === "leader" && showCreateTask && (
        <Card>

             

    <div className="mt-3 grid gap-3 md:grid-cols-2"></div>

          <h2 className="text-lg font-semibold">Crear tarea (individual)</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">

            

            <div>
              <div className="text-sm mb-1">Asignar a</div>
              <select
                className="w-full rounded-xl bg-black/30 px-3 py-2 ring-1 ring-white/10"
                value={taskAssignee}
                onChange={(e) => setTaskAssignee(e.target.value)}
              >
                {members
  .filter((m) => m.role === "advisor")
  .map((m) => (
    <option key={m.user_id} value={m.user_id}>
      {profiles[m.user_id] ?? `Asesor • ${m.user_id.slice(0, 6)}`}
    </option>
  ))}

              </select>
            </div>

            <div>
              <div className="text-sm mb-1">Vence (fecha/hora)</div>
              <Input type="datetime-local" value={taskDue} onChange={(e) => setTaskDue(e.target.value)} />
            </div>

            <div className="md:col-span-2">
              <div className="text-sm mb-1">Título</div>
              <Input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="Ej: Visitar cliente X" />
            </div>

            <div className="md:col-span-2">
              <div className="text-sm mb-1">Descripción (opcional)</div>
              <Textarea value={taskDesc} onChange={(e) => setTaskDesc(e.target.value)} rows={3} placeholder="Detalles..." />
            </div>

            <div className="md:col-span-2">
              <Button onClick={createTask}>Crear</Button>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <div className="space-y-2">
          {visibleTasks.length === 0 ? (
            <div className="text-sm text-gray-300">No hay tareas aquí.</div>
          ) : (
            visibleTasks.map((t) => (
              <div key={t.id} className="rounded-xl bg-white/5 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold">{t.title}</div>
                    {t.description && <div className="text-sm text-gray-300 mt-1">{t.description}</div>}
                    <div className="text-xs text-gray-400 mt-2">
                      Asignada: {new Date(t.assigned_at).toLocaleString()} • Vence: {new Date(t.due_at).toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-400">Asignada a: {t.assigned_to}</div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {(() => {
  const s = statusBadge(t.status);
  return (
    <div
      className={
        "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold " +
        s.className
      }
      title={`Estado: ${s.label}`}
    >
      <span className="text-sm leading-none">{s.icon}</span>
      <span>{s.label}</span>
    </div>
  );
})()}


                    {role === "advisor" && me?.id === t.assigned_to && (
                      <>
                        <Button onClick={() => toggleComplete(t)}>
                          {t.status === "completed" ? "Marcar pendiente" : "Completar"}
                        </Button>
                        <Button
                          onClick={() => {
                            setReasonFor(t.id);
                            setReasonText(t.not_done_reason ?? "");
                          }}
                        >
                          No completada
                        </Button>
                      </>
                    )}

                    {role === "leader" && <Button onClick={() => deleteTask(t.id)}>Eliminar</Button>}
                  </div>
                </div>

                {t.status === "not_completed" && t.not_done_reason && (
                  <div className="mt-2 text-sm text-gray-200">
                    Motivo: <span className="text-gray-300">{t.not_done_reason}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </Card>

      {reasonFor && (
        <div className="fixed inset-0 bg-black/70 p-5">
          <div className="mx-auto max-w-xl rounded-2xl bg-gray-900 p-4 ring-1 ring-white/10">
            <div className="flex items-center justify-between">
              <div className="font-semibold">Motivo de no ejecución</div>
              <Button onClick={() => { setReasonFor(null); setReasonText(""); }}>Cerrar</Button>
            </div>

            <div className="mt-3">
              <Textarea
                rows={5}
                value={reasonText}
                onChange={(e) => setReasonText(e.target.value)}
                placeholder="Explica por qué no se realizó..."
              />
            </div>

            <div className="mt-3 flex gap-2">
              <Button onClick={() => markNotCompleted(reasonFor)}>Guardar</Button>
              <Button onClick={() => { setReasonFor(null); setReasonText(""); }}>Cancelar</Button>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}
