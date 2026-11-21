"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Check, Wallet } from "lucide-react";

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
      <span className="brand-mark" aria-hidden="true"><Wallet size={20} /></span>}
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

  return <div className="appearance-page">
    <header className="page-heading appearance-heading">
      <div><span className="eyebrow">IDENTIDADE VISUAL</span><h1>Aparência</h1>
        <p>Deixe o MeuSaldo com o seu estilo. As mudanças são salvas neste dispositivo.</p>
      </div>
    </header>
    <div className="appearance-layout">
      <section className="panel appearance-config" aria-label="Configurações de aparência">
        <div className="appearance-section">
          <div className="appearance-section-heading"><strong>Nome do aplicativo</strong><span>Como o nome aparece no menu e no título da página.</span></div>
          <input className="text-input" maxLength={28} aria-label="Nome do aplicativo"
            value={appearance.name} onChange={e => change({ name: e.target.value })}
            placeholder="Nome do aplicativo" />
        </div>
        <div className="appearance-section">
          <div className="appearance-section-heading"><strong>Cor principal</strong><span>Escolha uma das paletas ou use sua própria cor.</span></div>
          <div className="appearance-palette">
            {palette.map((color, index) => <button key={color} type="button"
              className={appearance.color === color ? "appearance-swatch selected" : "appearance-swatch"}
              onClick={() => change({ color })}
              aria-label={["Roxo", "Azul", "Verde", "Rosa", "Laranja", "Verde petróleo"][index]}
              aria-pressed={appearance.color === color}
              title={color}
              style={{ backgroundColor: color }}>
                {appearance.color === color && <Check size={19} strokeWidth={3} aria-hidden="true" />}
              </button>)}
            <label className="appearance-color-custom" title="Escolher outra cor">
              <span className="sr-only">Cor personalizada</span>
              <input type="color" value={appearance.color} onChange={e => change({ color: e.target.value })}
                aria-label="Escolher cor personalizada" />
            </label>
          </div>
        </div>
        <div className="appearance-section">
          <label className="appearance-section-heading" htmlFor="appearance-theme"><strong>Tema</strong><span>Prefere claro, escuro ou automático?</span></label>
          <select id="appearance-theme" className="text-input" value={theme || "system"} onChange={e => setTheme(e.target.value)}>
            <option value="system">Automático (sistema)</option>
            <option value="light">Claro</option>
            <option value="dark">Escuro</option>
          </select>
        </div>
        <div className="appearance-section">
          <div className="appearance-section-heading"><strong>Logo do aplicativo</strong><span>PNG, JPG ou WebP, até 1 MB.</span></div>
          <input className="appearance-file-input" type="file" accept="image/png,image/jpeg,image/webp"
            aria-label="Enviar logo personalizada" onChange={e => void uploadLogo(e.target.files?.[0])} />
          {appearance.logo && <button type="button" className="button button-ghost" onClick={() => change({ logo: "" })}>Remover logo personalizada</button>}
        </div>
        <div className="appearance-actions">
          <button type="button" className="button button-secondary" onClick={() => change(DEFAULT_APPEARANCE)}>Restaurar nome, cor e logo</button>
          {notice && <p role="status">{notice}</p>}
        </div>
      </section>
      <aside className="appearance-preview-column">
        <div className="appearance-preview panel" aria-label="Prévia do aplicativo">
          <span className="appearance-preview-kicker">PRÉVIA AO VIVO</span>
          <div className="appearance-preview-identity">
            {appearance.logo ? <img src={appearance.logo} alt="" className="appearance-preview-logo" />
              : <span className="appearance-preview-mark"><Wallet size={26} aria-hidden="true" /></span>}
            <strong>{appearance.name || "MeuSaldo"}</strong>
          </div>
          <div className="appearance-preview-divider" />
          <div className="appearance-preview-demo">
            <span className="appearance-preview-dot" />
            <span className="appearance-preview-bar" />
            <span className="appearance-preview-action" />
          </div>
          <p>O resultado aparece imediatamente no menu do aplicativo.</p>
        </div>
        <p className="appearance-local-note">A personalização vale apenas neste navegador. O ícone do aplicativo instalado no celular ainda depende do sistema operacional e não é atualizado por esta tela.</p>
      </aside>
    </div>
  </div>;
}
