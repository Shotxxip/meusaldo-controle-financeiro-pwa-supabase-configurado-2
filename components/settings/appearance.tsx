"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

export const STORAGE_KEY = "meusaldo-v5-appearance";
export const DEFAULT_APPEARANCE = { name: "MeuSaldo", color: "#6d45d8", logo: "" };
export type Appearance = typeof DEFAULT_APPEARANCE;
export const APPEARANCE_EVENT = "meusaldo-appearance-changed";

const palette = ["#6d45d8", "#2563eb", "#059669", "#db2777", "#ea580c", "#0f766e"];

export function readAppearance(): Appearance {
  if (typeof window === "undefined") return DEFAULT_APPEARANCE;
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return {
      name: typeof saved.name === "string" ? saved.name.slice(0, 28) : DEFAULT_APPEARANCE.name,
      color: typeof saved.color === "string" && /^#[0-9a-f]{6}$/i.test(saved.color) ? saved.color : DEFAULT_APPEARANCE.color,
      logo: typeof saved.logo === "string" && saved.logo.startsWith("data:image/") ? saved.logo : ""
    };
  } catch { return DEFAULT_APPEARANCE; }
}

export function saveAppearance(next: Appearance) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(APPEARANCE_EVENT));
}

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const [appearance, setAppearance] = useState<Appearance>(DEFAULT_APPEARANCE);
  useEffect(() => {
    const update = () => setAppearance(readAppearance());
    update();
    window.addEventListener(APPEARANCE_EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(APPEARANCE_EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, []);
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--primary", appearance.color);
    root.style.setProperty("--primary-hover", `color-mix(in srgb, ${appearance.color} 80%, black)`);
    root.style.setProperty("--primary-soft", `color-mix(in srgb, ${appearance.color} 13%, transparent)`);
    root.style.setProperty("--brand-color", appearance.color);
    document.title = `${appearance.name || "MeuSaldo"} — Controle Financeiro`;
  }, [appearance]);
  return <>{children}</>;
}

export function BrandIdentity() {
  const [appearance, setAppearance] = useState<Appearance>(DEFAULT_APPEARANCE);
  useEffect(() => {
    const update = () => setAppearance(readAppearance());
    update();
    window.addEventListener(APPEARANCE_EVENT, update);
    return () => window.removeEventListener(APPEARANCE_EVENT, update);
  }, []);
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
    {appearance.logo ? <img src={appearance.logo} alt="" style={{ width: 36, height: 36, objectFit: "contain", borderRadius: 10 }} /> :
      <span className="brand-mark" aria-hidden="true" style={{ fontSize: 19 }}>▣</span>}
    <span>{appearance.name || "MeuSaldo"}</span>
  </span>;
}

export function AppearanceSettings() {
  const { theme, setTheme } = useTheme();
  const [appearance, setAppearance] = useState<Appearance>(DEFAULT_APPEARANCE);
  const [notice, setNotice] = useState("");
  useEffect(() => { setAppearance(readAppearance()); }, []);
  const change = (partial: Partial<Appearance>) => {
    const next = { ...appearance, ...partial };
    setAppearance(next);
    try { saveAppearance(next); setNotice("Alterações salvas neste dispositivo."); }
    catch { setNotice("Não foi possível salvar. Verifique o armazenamento do navegador."); }
  };
  async function uploadLogo(file?: File) {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setNotice("Use PNG, JPG ou WebP."); return;
    }
    if (file.size > 1024 * 1024) { setNotice("A imagem deve ter até 1 MB."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") change({ logo: reader.result });
    };
    reader.readAsDataURL(file);
  }
  return <section style={{ maxWidth: 620, display: "grid", gap: 24 }}>
    <header><h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Aparência</h1>
      <p style={{ color: "var(--muted-foreground)" }}>Personalize este dispositivo. Suas finanças não serão alteradas.</p></header>
    <div style={{ padding: 22, background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 16, display: "grid", gap: 22 }}>
      <label className="field"><span>Nome do aplicativo</span>
        <input className="text-input" maxLength={28} value={appearance.name} onChange={e => change({ name: e.target.value })} placeholder="Nome do aplicativo" />
      </label>
      <div className="field"><span>Cor principal</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          {palette.map(color => <button key={color} type="button" onClick={() => change({ color })} aria-label={`Escolher cor ${color}`} aria-pressed={appearance.color === color} style={{ width: 42, height: 42, background: color, border: appearance.color === color ? "3px solid var(--foreground)" : "2px solid transparent", borderRadius: 12 }} />)}
          <input type="color" value={appearance.color} onChange={e => change({ color: e.target.value })} aria-label="Escolher cor personalizada" style={{ width: 44, height: 42, cursor: "pointer" }} />
        </div>
      </div>
      <label className="field"><span>Tema</span>
        <select className="text-input" value={theme || "system"} onChange={e => setTheme(e.target.value)}>
          <option value="system">Automático (sistema)</option>
          <option value="light">Claro</option>
          <option value="dark">Escuro</option>
        </select>
      </label>
      <div className="field"><span>Logo personalizada (PNG, JPG ou WebP, até 1 MB)</span>
        <input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => void uploadLogo(e.target.files?.[0])} />
        {appearance.logo && <button type="button" className="button button-ghost" onClick={() => change({ logo: "" })}>Remover logo</button>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <BrandIdentity />
      </div>
      <button type="button" className="button button-secondary" onClick={() => change(DEFAULT_APPEARANCE)}>Restaurar nome, cor e logo padrão</button>
      {notice && <p role="status" style={{ color: "var(--muted-foreground)", margin: 0 }}>{notice}</p>}
    </div>
    <p style={{ color: "var(--muted-foreground)", fontSize: 12 }}>Nesta etapa, a logo muda dentro do aplicativo. A atualização do ícone instalado e do manifesto PWA será feita na próxima etapa.</p>
  </section>;
}
