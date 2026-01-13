export function Page({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="mx-auto max-w-5xl p-5">{children}</div>
    </div>
  );
}

export function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-gray-900/60 p-4 shadow ring-1 ring-white/10">
      {children}
    </div>
  );
}

export function Button(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={
        "rounded-xl bg-white/10 px-4 py-2 hover:bg-white/15 disabled:opacity-40 " +
        (props.className ?? "")
      }
    />
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={
        "w-full rounded-xl bg-black/30 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-white/25 " +
        (props.className ?? "")
      }
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={
        "w-full rounded-xl bg-black/30 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-white/25 " +
        (props.className ?? "")
      }
    />
  );
}
