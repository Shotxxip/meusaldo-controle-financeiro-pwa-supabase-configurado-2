$ErrorActionPreference = 'Stop'
$path = Join-Path $PSScriptRoot 'components\goals\goals-page.tsx'
if (-not (Test-Path $path)) { throw "Arquivo nao encontrado: $path. Extraia este pacote na pasta raiz do projeto." }
$content = [IO.File]::ReadAllText($path)
function Replace-Exact([string]$old, [string]$new) {
  if (-not $script:content.Contains($old)) { throw "Trecho esperado nao encontrado: $($old.Substring(0, [Math]::Min(65, $old.Length)))" }
  $script:content = $script:content.Replace($old, $new)
}
if ($content.Contains('function storeForLink(value: string)')) { Write-Host 'A correcao ja foi aplicada.'; exit 0 }
Replace-Exact 'function isAmazonLink(value: string) {' 'function storeForLink(value: string): string | null {'
Replace-Exact 'return url.protocol === "https:" && ["amazon.com.br", "a.co", "amzn.to"].some((domain) => host === domain || host.endsWith(`.${domain}`));' @'
if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
    const stores: Record<string, string[]> = { Amazon: ["amazon.com.br", "a.co", "amzn.to"], Shopee: ["shopee.com.br", "shope.ee"], "Mercado Livre": ["mercadolivre.com.br", "mercadolivre.com", "meli.la"], Pichau: ["pichau.com.br"] };
    return Object.entries(stores).find(([, domains]) => domains.some((domain) => host === domain || host.endsWith(`.${domain}`)))?.[0] ?? null;
'@.TrimEnd()
Replace-Exact "return false;`n  }`n}`n`nfunction safeImageUrl" "return null;`n  }`n}`n`nfunction safeImageUrl"
Replace-Exact 'return url.protocol === "https:" && (url.hostname === "m.media-amazon.com" || url.hostname.endsWith(".amazon.com")) ? url.toString() : null;' 'return url.protocol === "https:" && !url.username && !url.password && !url.port ? url.toString() : null;'
Replace-Exact 'async function searchAmazon() {' 'async function searchProduct() {'
Replace-Exact 'if (!isAmazonLink(amazonUrl.trim())) {' 'if (!storeForLink(amazonUrl.trim())) {'
Replace-Exact 'toast.error("Cole um link HTTPS da Amazon Brasil, a.co ou amzn.to.");' 'toast.error("Cole um link HTTPS da Amazon, Shopee, Mercado Livre ou Pichau.");'
Replace-Exact 'fetch("/api/amazon-preview",' 'fetch("/api/product-preview",'
Replace-Exact 'if (amazonUrl.trim() && !isAmazonLink(amazonUrl.trim())) return toast.error("O link deve pertencer à Amazon Brasil, a.co ou amzn.to.");' 'if (amazonUrl.trim() && !storeForLink(amazonUrl.trim())) return toast.error("Use um link da Amazon, Shopee, Mercado Livre ou Pichau.");'
Replace-Exact 'amazon_url: amazonUrl.trim() || null,' "amazon_url: storeForLink(amazonUrl.trim()) === `"Amazon`" ? amazonUrl.trim() : null,`n        product_url: amazonUrl.trim() || null,"
Replace-Exact 'Use um link da Amazon ou cadastre os dados manualmente.' 'Use um link da Amazon, Shopee, Mercado Livre ou Pichau, ou cadastre manualmente.'
Replace-Exact 'Link do produto na Amazon' 'Link do produto'
Replace-Exact 'Cole aqui o link do produto da Amazon...' 'Cole aqui o link da Amazon, Shopee, Mercado Livre ou Pichau...'
Replace-Exact 'searchAmazon()' 'searchProduct()'
Replace-Exact '{item.amazon_url && <a className="button button-ghost button-small" href={item.amazon_url} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} /> Amazon</a>}' '{((item as GoalItem & { product_url?: string | null }).product_url || item.amazon_url) && <a className="button button-ghost button-small" href={(item as GoalItem & { product_url?: string | null }).product_url || item.amazon_url || "#"} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} /> {storeForLink((item as GoalItem & { product_url?: string | null }).product_url || item.amazon_url || "") || "Ver produto"}</a>}'
Replace-Exact 'A leitura de preços na Amazon é automática quando permitida pelo site.' 'A leitura automática depende da disponibilidade de cada loja.'
$backup = "$path.bak-v4"
[IO.File]::Copy($path, $backup, $true)
[IO.File]::WriteAllText($path, $content, [Text.UTF8Encoding]::new($false))
Write-Host 'SUCESSO: goals-page.tsx atualizado. Backup salvo como goals-page.tsx.bak-v4' -ForegroundColor Green
