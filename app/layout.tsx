import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { AppearanceProvider } from "@/components/settings/appearance";
import { PwaRegister } from "@/components/layout/pwa-register";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "MeuSaldo — Controle Financeiro",
  description: "Organize receitas, despesas e acompanhe sua vida financeira.",
  applicationName: "MeuSaldo",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "MeuSaldo" },
  formatDetection: { telephone: false },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: "#111827",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR" suppressHydrationWarning><body><ThemeProvider><AppearanceProvider><PwaRegister />{children}<Toaster richColors position="top-right" /></AppearanceProvider></ThemeProvider></body></html>;
}
