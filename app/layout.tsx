import type { Metadata } from "next";
import { Geist_Mono, Space_Grotesk } from "next/font/google";
import StartupSplash from "@/components/layout/StartupSplash";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Agente RAG | Qiskit",
  description:
    "Ferramenta inteligente para análise e otimização de código quântico.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${spaceGrotesk.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <StartupSplash />
        {children}
      </body>
    </html>
  );
}
