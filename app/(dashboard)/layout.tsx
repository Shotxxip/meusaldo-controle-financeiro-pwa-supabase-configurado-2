import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/app-shell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return <main className="setup-screen"><div className="setup-card"><div className="brand-mark"><span>MS</span></div><h1>Falta conectar o Supabase</h1><p>Configure as variáveis <code>NEXT_PUBLIC_SUPABASE_URL</code> e <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> no arquivo <code>.env.local</code> e reinicie o projeto.</p><a className="button button-primary" href="/login">Ir para login</a></div></main>;
  }
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <AppShell email={user.email ?? "Conta"}>{children}</AppShell>;
}
