"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CreditCard, LayoutDashboard, LogOut, Menu, Tags, X, Target, PiggyBank, Palette, BarChart3 } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { BrandIdentity } from "@/components/settings/appearance";
import { cn } from "@/lib/utils/cn";
import type { ReactNode } from "react";

const links = [
  { href: "/", label: "Visão geral", icon: LayoutDashboard },
  { href: "/transacoes", label: "Transações", icon: CreditCard },
  { href: "/categorias", label: "Categorias", icon: Tags },
  { href: "/metas", label: "Metas", icon: Target },
  { href: "/economias", label: "Economias", icon: PiggyBank },
  { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { href: "/aparencia", label: "Aparência", icon: Palette }
];

export function AppShell({ children, email }: { children: ReactNode; email: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function signOut() {
    setLoggingOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.replace("/login");
      router.refresh();
    } finally { setLoggingOut(false); }
  }

  const nav = (mobile = false) => (mobile ? links.filter(link => link.href !== "/aparencia" && link.href !== "/relatorios") : links).map(({ href, label, icon: Icon }) => {
    const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
    return <Link key={href} href={href} onClick={() => setMenuOpen(false)} className={cn(mobile ? "bottom-link" : "sidebar-link", active && "active")}>
      <Icon size={mobile ? 20 : 19} strokeWidth={active ? 2.3 : 1.8} />
      <span>{label}</span>
    </Link>;
  });

  return <div className="app-frame">
    <aside className="sidebar">
      <Link className="brand" href="/"><BrandIdentity /></Link>
      <div className="sidebar-caption">MENU PRINCIPAL</div>
      <nav className="sidebar-nav">{nav()}</nav>
      <div className="sidebar-bottom">
        <div className="account-chip"><div className="avatar">{email.charAt(0).toUpperCase()}</div><div className="account-info"><strong>Minha conta</strong><span title={email}>{email}</span></div></div>
        <button className="sidebar-link signout" type="button" onClick={signOut} disabled={loggingOut}><LogOut size={18} /><span>{loggingOut ? "Saindo..." : "Sair da conta"}</span></button>
        <p className="sidebar-footnote">Seu dinheiro, sob controle.</p>
      </div>
    </aside>

    {menuOpen && <button className="mobile-backdrop" aria-label="Fechar menu" onClick={() => setMenuOpen(false)} />}
    <aside className={cn("mobile-drawer", menuOpen && "open")}>
      <div className="drawer-head"><Link className="brand" href="/"><BrandIdentity /></Link><button className="icon-button" onClick={() => setMenuOpen(false)} aria-label="Fechar menu"><X size={19} /></button></div>
      <div className="sidebar-caption">MENU PRINCIPAL</div><nav className="sidebar-nav">{nav()}</nav>
      <div className="drawer-account">{email}</div><button className="sidebar-link signout" type="button" onClick={signOut}><LogOut size={18} /><span>Sair da conta</span></button>
    </aside>

    <main className="main-area">
      <header className="topbar">
        <button className="icon-button mobile-menu-button" aria-label="Abrir menu" onClick={() => setMenuOpen(true)}><Menu size={20} /></button>
        <div className="topbar-context"><span className="topbar-dot" /> CONTROLE FINANCEIRO</div>
        <div className="topbar-actions"><ThemeToggle /><Link href="/aparencia" className="icon-button" aria-label="Personalizar aparência"><Palette size={18} /></Link><div className="topbar-avatar" title={email}>{email.charAt(0).toUpperCase()}</div></div>
      </header>
      <div className="page-content">{children}</div>
    </main>
    <nav className="bottom-nav">{nav(true)}</nav>
  </div>;
}
