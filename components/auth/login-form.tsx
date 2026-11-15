"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, LoaderCircle, LockKeyhole, Mail, Wallet } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Preencha seu e-mail e sua senha.");
      return;
    }
    if (password.length < 6) {
      toast.error("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        toast.success("Login realizado. Bem-vindo!");
        router.replace("/");
        router.refresh();
      } else {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) throw error;
        if (data.session) {
          toast.success("Conta criada com sucesso!");
          router.replace("/");
          router.refresh();
        } else {
          toast.success("Cadastro criado. Verifique seu e-mail para confirmar a conta.");
          setMode("login");
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível concluir a solicitação.";
      toast.error(message.includes("Invalid login credentials") ? "E-mail ou senha incorretos." : message);
    } finally {
      setLoading(false);
    }
  }

  return <main className="login-screen">
    <div className="login-decoration decoration-one" /><div className="login-decoration decoration-two" />
    <section className="login-panel">
      <div className="login-brand"><span className="brand-mark brand-mark-large"><Wallet size={25} /></span><span>Meu<span className="brand-accent">Saldo</span></span></div>
      <div className="login-heading"><div className="eyebrow">FINANÇAS EM ORDEM</div><h1>{mode === "login" ? "Bem-vindo de volta" : "Crie sua conta"}</h1><p>{mode === "login" ? "Entre para acompanhar seu dinheiro com clareza." : "Comece a organizar suas receitas e despesas."}</p></div>
      <form className="login-form" onSubmit={handleSubmit}>
        <label className="field-label" htmlFor="email">E-mail</label>
        <div className="input-with-icon"><Mail size={18} /><input id="email" type="email" autoComplete="email" placeholder="voce@exemplo.com" value={email} onChange={(event) => setEmail(event.target.value)} required /></div>
        <label className="field-label" htmlFor="password">Senha</label>
        <div className="input-with-icon"><LockKeyhole size={18} /><input id="password" type={showPassword ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder="Mínimo de 6 caracteres" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={6} /><button className="password-toggle" type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
        <button className="button button-primary login-submit" type="submit" disabled={loading}>{loading ? <LoaderCircle className="spin" size={18} /> : <>{mode === "login" ? "Entrar na minha conta" : "Criar conta"}<ArrowRight size={18} /></>}</button>
      </form>
      <p className="login-switch">{mode === "login" ? "Ainda não tem uma conta?" : "Já possui uma conta?"} <button type="button" onClick={() => setMode(mode === "login" ? "signup" : "login")}>{mode === "login" ? "Criar conta" : "Fazer login"}</button></p>
      <div className="login-security"><LockKeyhole size={14} /> Seus dados financeiros são privados e protegidos.</div>
    </section>
    <footer className="login-footer">MEUSALDO · CONTROLE FINANCEIRO PESSOAL</footer>
  </main>;
}
