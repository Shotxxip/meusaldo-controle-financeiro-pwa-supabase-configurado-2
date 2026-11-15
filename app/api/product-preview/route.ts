import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const hosts: Record<string, string[]> = {
  Amazon: ["amazon.com.br", "a.co", "amzn.to"],
  Shopee: ["shopee.com.br", "shope.ee", "s.shopee.com.br"],
  "Mercado Livre": ["mercadolivre.com.br", "mercadolivre.com", "mercadolivre.com/sec", "meli.la"],
  Pichau: ["pichau.com.br"],
};
const allowed = (host: string, domain: string) => host === domain || host.endsWith(`.${domain}`);
const storeFor = (host: string) => Object.entries(hosts).find(([, domains]) => domains.some((d) => allowed(host.toLowerCase(), d)))?.[0] ?? null;
const valid = (url: URL) => url.protocol === "https:" && !!storeFor(url.hostname) && !url.username && !url.password && !url.port;
const decode = (s: string) => s.replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/&nbsp;/gi, " ").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n))).trim();

function meta(html: string, names: string[]): string | null {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const attrs: Record<string, string> = {};
    for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) attrs[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? "";
    const key = (attrs.property ?? attrs.name ?? attrs.itemprop ?? "").toLowerCase();
    if (names.includes(key) && attrs.content) return decode(attrs.content);
  }
  return null;
}
function priceFrom(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) && value > 0 && value < 100000000 ? Math.round(value * 100) / 100 : null;
  if (typeof value !== "string") return null;
  const match = value.match(/\d[\d.,\s]*(?:\d)/) ?? value.match(/\d/);
  if (!match) return null;
  let raw = match[0].replace(/\s/g, "");
  if (raw.includes(",") && raw.includes(".")) raw = raw.lastIndexOf(",") > raw.lastIndexOf(".") ? raw.replace(/\./g, "").replace(",", ".") : raw.replace(/,/g, "");
  else if (raw.includes(",")) raw = raw.replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(raw)) raw = raw.replace(/\./g, "");
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 && n < 100000000 ? Math.round(n * 100) / 100 : null;
}
function structured(html: string): { title: string | null; price: number | null; image: string | null } {
  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const obj: unknown = JSON.parse(match[1]);
      const walk = (value: unknown): Record<string, unknown> | null => {
        if (Array.isArray(value)) { for (const v of value) { const found = walk(v); if (found) return found; } return null; }
        if (!value || typeof value !== "object") return null;
        const record = value as Record<string, unknown>;
        const type = record["@type"];
        if (type === "Product" || (Array.isArray(type) && type.includes("Product"))) return record;
        return walk(record["@graph"]);
      };
      const product = walk(obj);
      if (!product) continue;
      const offer = Array.isArray(product.offers) ? product.offers[0] : product.offers;
      const offerObj = offer && typeof offer === "object" ? offer as Record<string, unknown> : {};
      const image = Array.isArray(product.image) ? product.image[0] : product.image;
      return { title: typeof product.name === "string" ? product.name : null, price: priceFrom(offerObj.price ?? (offerObj.priceSpecification as Record<string, unknown> | undefined)?.price), image: typeof image === "string" ? image : null };
    } catch { /* Ignore malformed structured data. */ }
  }
  return { title: null, price: null, image: null };
}
function safeImage(value: string | null, base: URL): string | null {
  if (!value) return null;
  try { const u = new URL(value, base); return u.protocol === "https:" && !u.username && !u.password && !u.port ? u.toString() : null; } catch { return null; }
}
function manual(store: string) {
  return NextResponse.json({ success: false, store, message: `A ${store} não permitiu a leitura automática deste produto. Preencha os dados manualmente; o link será mantido.` });
}
export async function POST(request: NextRequest) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ success: false, message: "Envie um link válido." }, { status: 400 }); }
  const raw = body && typeof body === "object" && "url" in body ? (body as { url: unknown }).url : null;
  if (typeof raw !== "string" || raw.length > 2048) return NextResponse.json({ success: false, message: "Informe um link válido." }, { status: 400 });
  let url: URL;
  try { url = new URL(raw.trim()); } catch { return NextResponse.json({ success: false, message: "URL inválida." }, { status: 400 }); }
  if (!valid(url)) return NextResponse.json({ success: false, message: "Use um link HTTPS da Amazon, Shopee, Mercado Livre ou Pichau." }, { status: 400 });
  const store = storeFor(url.hostname)!;
  try {
    let response: Response | null = null;
    for (let i = 0; i < 6; i++) {
      response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(12000), headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128.0.0.0 Safari/537.36", Accept: "text/html,application/xhtml+xml", "Accept-Language": "pt-BR,pt;q=0.9" } });
      if (![301, 302, 303, 307, 308].includes(response.status)) break;
      const location = response.headers.get("location");
      if (!location || i === 5) return manual(store);
      const next = new URL(location, url);
      if (!valid(next)) return manual(store);
      url = next;
    }
    if (!response?.ok || !(response.headers.get("content-type") ?? "").includes("text/html")) return manual(store);
    const reader = response.body?.getReader();
    if (!reader) return manual(store);
    const chunks: Uint8Array[] = []; let total = 0;
    while (true) { const { done, value } = await reader.read(); if (done) break; total += value.byteLength; if (total > 1500000) { await reader.cancel(); return manual(store); } chunks.push(value); }
    const bytes = new Uint8Array(total); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    const html = new TextDecoder().decode(bytes);
    if (/captcha|robot check|access denied|verify you are human|cloudflare challenge/i.test(html.slice(0, 30000))) return manual(store);
    const ld = structured(html);
    const title = ld.title ?? meta(html, ["og:title", "twitter:title"]);
    const price = ld.price ?? priceFrom(meta(html, ["product:price:amount", "og:price:amount", "price"]));
    const imageUrl = safeImage(ld.image ?? meta(html, ["og:image", "twitter:image"]), url);
    if (!title && !price && !imageUrl) return manual(store);
    return NextResponse.json({ success: true, store, title: title?.slice(0, 160) ?? null, price, imageUrl, message: price ? `Dados da ${store} encontrados. Confira o preço antes de salvar.` : `Dados da ${store} encontrados. Informe o preço manualmente.` });
  } catch { return manual(store); }
}
