"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <button className="icon-button" aria-label="Alterar tema" type="button"><Sun size={18} /></button>;
  const dark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  return <button className="icon-button" aria-label={dark ? "Ativar modo claro" : "Ativar modo escuro"} onClick={() => setTheme(dark ? "light" : "dark")} type="button">
    {dark ? <Sun size={18} /> : <Moon size={18} />}
  </button>;
}
