"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Check, ExternalLink, Gift, ImageOff, LoaderCircle, Minus, Plus, Search, ShoppingBag, Sparkles, Target, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils/finance";
import type { ProductPreviewResponse, GoalItem } from "@/types/goals";

type TransactionSummary = { amount: number; type: "income" | "expense"; is_paid: boolean };

function storeForLink(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
    const host = url.hostname.toLowerCase();
    const stores: Record<string, string[]> = {
      Amazon: ["amazon.com.br", "a.co", "amzn.to"],
      Shopee: ["shopee.com.br", "shope.ee"],
      "Mercado Livre": ["mercadolivre.com.br", "mercadolivre.com", "meli.la"],
      Pichau: ["pichau.com.br"]
    };
    return Object.entries(stores).find(([, domains]) =>
      domains.some(domain => host === domain || host.endsWith(`.${domain}`))
    )?.[0] ?? null;
  } catch { return null; }
}

function safeImageUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.port
      ? url.toString() : null;
  } catch { return null; }
}

export function GoalsPage() {
  const [items, setItems] = useState<GoalItem[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [productUrl, setProductUrl] = useState("");
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [imageUrl, setImageUrl] = useState("");
  const [showManual, setShowManual] = useState(false);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) {
      setUserId(null); setItems([]); setAvailableBalance(0);
      return;
    }
    setUserId(user.id);
    const [goalsResult, transactionsResult] = await Promise.all([
      supabase.from("goals_items").select("*").order("created_at", { ascending: false }),
      supabase.from("transactions").select("amount,type,is_paid").eq("is_paid", true)
    ]);
    if (goalsResult.error) throw goalsResult.error;
    if (transactionsResult.error) throw transactionsResult.error;
    setItems((goalsResult.data ?? []) as GoalItem[]);
    const balance = ((transactionsResult.data ?? []) as TransactionSummary[]).reduce((total, transaction) => {
      const amount = Number(transaction.amount) || 0;
      return total + (transaction.type === "income" ? amount : -amount);
    }, 0);
    setAvailableBalance(Math.max(0, balance));
    setError(null);
  }, []);

  useEffect(() => {
    let mounted = true;
    void refresh().catch((cause: unknown) => {
      if (!mounted) return;
      const message = cause instanceof Error ? cause.message : "Não foi possível carregar suas metas.";
      setError(message.includes("goals_items")
        ? "A tabela goals_items ainda não foi criada. Execute o SQL incluído em supabase/migrations no SQL Editor do Supabase e atualize esta página."
        : message);
    }).finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [refresh]);

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    const channel = supabase.channel(`goals-realtime-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "goals_items", filter: `user_id=eq.${userId}` }, () => { void refresh().catch(() => undefined); })
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions", filter: `user_id=eq.${userId}` }, () => { void refresh().catch(() => undefined); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [userId, refresh]);

  const activeItems = useMemo(() => items.filter(item => !item.is_purchased), [items]);
  const total = useMemo(() => activeItems.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0), [activeItems]);
  const missing = Math.max(0, total - availableBalance);
  const progress = total > 0 ? Math.min(100, (availableBalance / total) * 100) : items.length > 0 ? 100 : 0;
  const purchasedCount = items.filter(item => item.is_purchased).length;

  async function searchProduct() {
    const url = productUrl.trim();
    if (!storeForLink(url)) {
      toast.error("Cole um link HTTPS da Amazon, Shopee, Mercado Livre ou Pichau.");
      return;
    }
    setPreviewing(true);
    try {
      const response = await fetch("/api/product-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url })
      });
      const data = (await response.json()) as ProductPreviewResponse;
      if (data.title) setTitle(data.title);
      if (data.price && data.price > 0) setPrice(data.price.toFixed(2));
      const image = safeImageUrl(data.imageUrl ?? null);
      if (image) setImageUrl(image);
      if (data.success) toast.success(data.message ?? "Dados encontrados. Confira antes de salvar.");
      else toast.info(data.message ?? "Preencha os dados manualmente.");
      setShowManual(true);
    } catch {
      toast.info("Não foi possível buscar automaticamente. Preencha nome e preço manualmente.");
      setShowManual(true);
    } finally { setPreviewing(false); }
  }

  async function addItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanTitle = title.trim();
    const parsedPrice = Number(price.replace(",", "."));
    const parsedQuantity = Number(quantity);
    const cleanUrl = productUrl.trim();
    const store = cleanUrl ? storeForLink(cleanUrl) : null;
    if (!cleanTitle || cleanTitle.length > 160) return toast.error("Informe um nome válido (até 160 caracteres).");
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0 || parsedPrice > 99_999_999.99) return toast.error("Informe um preço válido maior que zero.");
    if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1 || parsedQuantity > 999) return toast.error("A quantidade deve ser um número inteiro entre 1 e 999.");
    if (cleanUrl && !store) return toast.error("Use um link da Amazon, Shopee, Mercado Livre ou Pichau.");

    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error("Sua sessão expirou. Entre novamente.");
      const { error: insertError } = await supabase.from("goals_items").insert({
        user_id: user.id,
        title: cleanTitle,
        price: parsedPrice,
        quantity: parsedQuantity,
        amazon_url: store === "Amazon" ? cleanUrl : null,
        product_url: cleanUrl || null,
        image_url: safeImageUrl(imageUrl)
      });
      if (insertError) throw insertError;
      toast.success("Item adicionado à sua lista!");
      setProductUrl(""); setTitle(""); setPrice(""); setQuantity("1"); setImageUrl(""); setShowManual(false);
      await refresh();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Não foi possível adicionar o item.");
    } finally { setSaving(false); }
  }

  async function updateItem(id: string, changes: Partial<Pick<GoalItem, "quantity" | "is_purchased">>) {
    const supabase = createClient();
    const { error: updateError } = await supabase.from("goals_items").update(changes).eq("id", id);
    if (updateError) toast.error(updateError.message);
    else await refresh();
  }

  async function deleteItem(item: GoalItem) {
    if (!window.confirm(`Excluir “${item.title}” da sua lista?`)) return;
    const supabase = createClient();
    const { error: deleteError } = await supabase.from("goals_items").delete().eq("id", item.id);
    if (deleteError) toast.error(deleteError.message);
    else { toast.success("Item removido."); await refresh(); }
  }

  return <div className="goals-page">
    <div className="page-heading goals-heading">
      <div><span className="eyebrow">PLANOS QUE VIRAM CONQUISTAS</span><h1>Metas</h1><p>Monte sua lista de desejos e acompanhe quanto falta para conquistar cada item.</p></div>
    </div>

    {error && <div className="inline-error" role="alert">{error}</div>}

    <section className="goals-progress-panel">
      <div className="goals-progress-header"><div className="goals-progress-icon"><Target size={21} /></div><div><span className="goals-overline">SUA META DE COMPRAS</span><h2>Seu próximo objetivo está mais perto</h2></div><span className="goals-progress-percent">{Math.round(progress)}% concluído</span></div>
      <div className="goals-progress-track" role="progressbar" aria-label="Progresso da meta" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}><div className="goals-progress-fill" style={{ width: `${progress}%` }} /></div>
      <div className="goals-metrics">
        <div><span>Valor total da lista</span><strong>{loading ? "—" : formatCurrency(total)}</strong></div>
        <div><span>Saldo disponível</span><strong>{loading ? "—" : formatCurrency(availableBalance)}</strong></div>
        <div className="goals-missing"><span>{missing > 0 ? "Quanto falta guardar" : "Situação"}</span><strong className={missing > 0 ? "" : "is-achieved"}>{loading ? "—" : missing > 0 ? formatCurrency(missing) : "Meta atingida!"}</strong></div>
      </div>
      <p className="goals-balance-note">O saldo é calculado pelas receitas menos despesas marcadas como pagas no seu extrato.</p>
    </section>

    <section className="goals-add-panel">
      <div className="goals-section-title"><div className="goals-title-icon"><ShoppingBag size={18} /></div><div><h2>Adicionar item</h2><p>Use um link da Amazon, Shopee, Mercado Livre ou Pichau, ou cadastre manualmente.</p></div></div>
      <div className="goals-link-search"><label className="sr-only" htmlFor="product-url">Link do produto</label><div className="goals-link-input"><ExternalLink size={17} /><input id="product-url" type="url" value={productUrl} onChange={event => setProductUrl(event.target.value)} placeholder="Cole aqui o link do produto..." /></div><button className="button button-primary" type="button" onClick={() => void searchProduct()} disabled={previewing || !productUrl.trim()}>{previewing ? <LoaderCircle size={16} className="spin" /> : <Search size={16} />}{previewing ? "Buscando..." : "Buscar dados"}</button></div>
      <button className="goals-manual-toggle" type="button" onClick={() => setShowManual(current => !current)}><Plus size={15} /> {showManual ? "Fechar cadastro manual" : "Ou preencher manualmente"}</button>
      {showManual && <form className="goals-item-form" onSubmit={addItem}>
        <div className="goals-form-grid"><label className="field goals-field-title"><span>Nome do produto</span><input className="text-input" value={title} onChange={event => setTitle(event.target.value)} maxLength={160} placeholder="Ex.: Fone Bluetooth" required /></label><label className="field"><span>Preço unitário (R$)</span><input className="text-input" type="number" inputMode="decimal" min="0.01" max="99999999.99" step="0.01" value={price} onChange={event => setPrice(event.target.value)} placeholder="0,00" required /></label><label className="field"><span>Quantidade</span><input className="text-input" type="number" min="1" max="999" step="1" value={quantity} onChange={event => setQuantity(event.target.value)} required /></label></div>
        <label className="field"><span>URL da imagem (opcional)</span><input className="text-input" type="url" value={imageUrl} onChange={event => setImageUrl(event.target.value)} placeholder="https://..." /></label>
        <div className="goals-form-actions"><span className="field-hint">Confira o preço e a quantidade antes de salvar.</span><button className="button button-primary" type="submit" disabled={saving}>{saving ? <LoaderCircle size={16} className="spin" /> : <Plus size={16} />}{saving ? "Salvando..." : "Adicionar à lista"}</button></div>
      </form>}
    </section>

    <section className="goals-list-section">
      <div className="goals-list-heading"><div><h2>Minha lista de desejos</h2><p>{activeItems.length} {activeItems.length === 1 ? "item pendente" : "itens pendentes"}{purchasedCount > 0 ? ` · ${purchasedCount} comprado${purchasedCount > 1 ? "s" : ""}` : ""}</p></div><div className="goals-list-total"><span>Total pendente</span><strong>{formatCurrency(total)}</strong></div></div>
      {loading ? <div className="goals-empty"><LoaderCircle className="spin" size={23} /><span>Carregando sua lista...</span></div> : items.length === 0 ? <div className="goals-empty"><div className="goals-empty-icon"><Gift size={25} /></div><strong>Sua lista ainda está vazia</strong><span>Adicione um produto para começar a acompanhar sua próxima conquista.</span></div> : <div className="goals-items-grid">
        {items.map(item => {
          const safeImage = safeImageUrl(item.image_url);
          const itemUrl = item.product_url || item.amazon_url;
          return <article className={`goal-item-card${item.is_purchased ? " purchased" : ""}`} key={item.id}>
            <div className="goal-item-image">{safeImage ? <img src={safeImage} alt={item.title} loading="lazy" /> : <div className="goal-image-placeholder"><ImageOff size={22} /></div>}{item.is_purchased && <span className="goal-purchased-badge"><Check size={13} /> Comprado</span>}</div>
            <div className="goal-item-content"><h3 title={item.title}>{item.title}</h3><div className="goal-price-line"><span>Preço unitário</span><strong>{formatCurrency(Number(item.price))}</strong></div>
              <div className="goal-item-bottom"><div className="goal-quantity-control"><button type="button" className="icon-button" aria-label={`Diminuir quantidade de ${item.title}`} disabled={item.quantity <= 1 || item.is_purchased} onClick={() => void updateItem(item.id, { quantity: Math.max(1, item.quantity - 1) })}><Minus size={14} /></button><span>{item.quantity}</span><button type="button" className="icon-button" aria-label={`Aumentar quantidade de ${item.title}`} disabled={item.quantity >= 999 || item.is_purchased} onClick={() => void updateItem(item.id, { quantity: Math.min(999, item.quantity + 1) })}><Plus size={14} /></button></div><div className="goal-subtotal"><span>Subtotal</span><strong>{formatCurrency(Number(item.price) * item.quantity)}</strong></div></div>
              <div className="goal-item-actions">{itemUrl && <a className="button button-ghost button-small" href={itemUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} /> {storeForLink(itemUrl) ?? "Ver produto"}</a>}<button className={`button button-small ${item.is_purchased ? "button-secondary" : "button-primary"}`} type="button" onClick={() => void updateItem(item.id, { is_purchased: !item.is_purchased })} aria-label={item.is_purchased ? `Desmarcar ${item.title} como comprado` : `Marcar ${item.title} como comprado`}><Check size={14} />{item.is_purchased ? "Desfazer" : "Marcar comprado"}</button><button className="icon-button goal-delete-button" type="button" aria-label={`Excluir ${item.title}`} onClick={() => void deleteItem(item)}><Trash2 size={15} /></button></div>
            </div>
          </article>;
        })}
      </div>}
    </section>
    <p className="goals-footnote"><Sparkles size={14} /> A leitura automática depende da disponibilidade de cada loja. Sempre confira os valores antes de adicionar à sua lista.</p>
  </div>;
}
