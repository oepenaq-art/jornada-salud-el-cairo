import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jornada de Salud El Cairo | Fundación Tejas para mi Pueblo",
  description:
    "Plataforma móvil de atención médica, triaje de seguimiento/remisión y dictado clínico estructurado con IA para la Jornada de Salud en El Cairo, Valle del Cauca.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#356530",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-gray-100 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
