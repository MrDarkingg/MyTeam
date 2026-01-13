import "./globals.css";

export const metadata = {
  title: "MyTeam",
  description: "Tareas por equipos para líderes y asesores",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-gray-950 text-gray-100">{children}</body>
    </html>
  );
}
