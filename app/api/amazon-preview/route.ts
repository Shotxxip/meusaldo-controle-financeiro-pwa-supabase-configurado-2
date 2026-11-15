import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_HOSTS = ["amazon.com.br", "a.co", "amzn.to"];
const MAX_HTML_BYTES = 1_500_000;

function isAllowedAmazonHost(hostname: string) {
  const host = hostname.toLowerCase();
  return ALLOWED_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/\\u0026/g, "&")
    .trim();
}

function metaContent(html: string, keys: string[]) {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const attrs: Record<string, string> = {};
    for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
      attrs[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? "";
    }
    const key = (attrs.property ?? attrs.name ?? attrs.itemprop ?? "").toLowerCase();
    if (keys.includes(key) && attrs.content) return decodeHtml(attrs.content);
  }
  return null;
}

function elementText(html: string, selectorId: string) {
  const expression = new RegExp(`<[^>]+(?:id|class)=["'][^"']*${selectorId}[^"']*["'][^>]*>([\\s\\S]*?)<\\/[^>]+>`, "i");
  const match = html.match(expression);
  if (!match?.[1]) return null;
  return decodeHtml(match[1].replace(/<[^>]*>/g, " ").replace(/\s+/g, " "));
}

function parsePrice(value: string | null) {
  if (!value) return null;
  const match = value.match(/\d[\d.\s]*(?:,\d{1,2}|\.\d{1,2})?/);
  if (!match) return null;
  let normalized = match[0].replace(/\s/g, "");
  if (normalized.includes(",")) normalized = normalized.replace(/\./g, "").replace(",", ".");
  const price = Number(normalized);
  return Number.isFinite(price) && price > 0 && price < 100_000_000 ? Math.round(price * 100) / 100 : null;
}

async function readLimited(response: Response) {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_HTML_BYTES) {
      await reader.cancel();
      throw new Error("A página da Amazon é muito grande para leitura automática.");
    }
    chunks.push(value);
  }
  const joined = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    joined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8").decode(joined);
}

function blockedResponse() {
  return NextResponse.json({
    success: false,
    message: "A Amazon bloqueou a leitura automática desta página (proteção contra robôs ou captcha). Você pode preencher o nome e o preço manualmente; o cadastro continua funcionando normalmente.",
  });
}

export async function POST(request: NextRequest) {
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: "Envie um link válido da Amazon." }, { status: 400 });
  }

  const rawUrl = typeof input === "object" && input !== null && "url" in input ? (input as { url?: unknown }).url : null;
  if (typeof rawUrl !== "string" || rawUrl.length > 2_048) {
    return NextResponse.json({ success: false, message: "Informe um link da Amazon válido." }, { status: 400 });
  }

  let currentUrl: URL;
  try {
    currentUrl = new URL(rawUrl.trim());
  } catch {
    return NextResponse.json({ success: false, message: "O link informado não é uma URL válida." }, { status: 400 });
  }
  if (currentUrl.protocol !== "https:" || !isAllowedAmazonHost(currentUrl.hostname)) {
    return NextResponse.json({ success: false, message: "Use um link HTTPS da Amazon Brasil, a.co ou amzn.to." }, { status: 400 });
  }

  try {
    let response: Response | null = null;
    for (let redirectCount = 0; redirectCount <= 5; redirectCount += 1) {
      response = await fetch(currentUrl, {
        method: "GET",
        redirect: "manual",
        signal: AbortSignal.timeout(12_000),
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
        },
      });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        if (!location || redirectCount === 5) return blockedResponse();
        const nextUrl = new URL(location, currentUrl);
        if (nextUrl.protocol !== "https:" || !isAllowedAmazonHost(nextUrl.hostname)) {
          return NextResponse.json({ success: false, message: "O link redirecionou para um domínio não permitido." }, { status: 400 });
        }
        currentUrl = nextUrl;
        continue;
      }
      break;
    }

    if (!response || !response.ok || !(response.headers.get("content-type") ?? "").includes("text/html")) {
      return blockedResponse();
    }

    const html = await readLimited(response);
    if (/captcha|robot check|validatecaptcha|sorry! we just need to make sure you're not a robot/i.test(html)) {
      return blockedResponse();
    }

    const title = metaContent(html, ["og:title", "twitter:title"]) ?? elementText(html, "productTitle");
    const priceText = metaContent(html, ["product:price:amount", "og:price:amount", "price", "twitter:data1"])
      ?? elementText(html, "a-offscreen")
      ?? html.match(/"priceAmount"\s*:\s*"?([\d.,]+)"?/i)?.[1]
      ?? html.match(/"price"\s*:\s*"(\d+(?:\.\d{1,2})?)"/i)?.[1]
      ?? null;
    const imageUrl = metaContent(html, ["og:image", "twitter:image"])
      ?? html.match(/"hiRes"\s*:\s*"(https?:\\\/\\\/[^"\\]+)"/i)?.[1]?.replace(/\\\//g, "/")
      ?? html.match(/"large"\s*:\s*"(https?:[^" ]+\.jpg[^" ]*)"/i)?.[1]
      ?? null;
    const price = parsePrice(priceText);

    if (!title && !price && !imageUrl) return blockedResponse();
    return NextResponse.json({
      success: true,
      title: title?.slice(0, 160) ?? null,
      price,
      imageUrl: imageUrl && imageUrl.startsWith("https://") ? imageUrl : null,
      message: price ? "Dados encontrados. Confira o preço antes de salvar." : "Encontramos alguns dados, mas o preço não foi identificado. Complete o valor manualmente.",
    });
  } catch {
    return blockedResponse();
  }
}
