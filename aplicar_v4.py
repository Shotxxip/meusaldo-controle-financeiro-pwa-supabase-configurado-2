"""Execute na raiz do repositório MeuSaldo: python aplicar_v4.py"""
from pathlib import Path
import shutil

root = Path.cwd()
page = root / 'components/goals/goals-page.tsx'
types = root / 'types/goals.ts'
if not page.exists() or not types.exists() or not (root/'package.json').exists():
    raise SystemExit('ERRO: execute este script na pasta raiz do projeto MeuSaldo, onde existe package.json.')

source = page.read_text(encoding='utf-8')
old = source

def change(a, b):
    global source
    if a not in source:
        raise SystemExit('ERRO: trecho esperado nao encontrado em goals-page.tsx. Nenhum arquivo foi alterado. Trecho: '+a[:100])
    source = source.replace(a,b)

change('function isAmazonLink(value: string) {', 'function isSupportedProductLink(value: string) {')
change('return url.protocol === "https:" && ["amazon.com.br", "a.co", "amzn.to"].some((domain) => host === domain || host.endsWith(`.${domain}`));', 'return url.protocol === "https:" && ["amazon.com.br", "a.co", "amzn.to", "shopee.com.br", "shope.ee", "mercadolivre.com.br", "mercadolivre.com", "meli.la", "pichau.com.br"].some((domain) => host === domain || host.endsWith(`.${domain}`));')
change('return url.protocol === "https:" && (url.hostname === "m.media-amazon.com" || url.hostname.endsWith(".amazon.com")) ? url.toString() : null;', 'return url.protocol === "https:" && !url.username && !url.password && !url.port ? url.toString() : null;')
change('async function searchAmazon() {', 'async function searchProduct() {')
change('if (!isAmazonLink(amazonUrl.trim())) {', 'if (!isSupportedProductLink(amazonUrl.trim())) {')
change('toast.error("Cole um link HTTPS da Amazon Brasil, a.co ou amzn.to.");', 'toast.error("Cole um link HTTPS da Amazon, Shopee, Mercado Livre ou Pichau.");')
change('fetch("/api/amazon-preview", {', 'fetch("/api/product-preview", {')
change('if (amazonUrl.trim() && !isAmazonLink(amazonUrl.trim())) return toast.error("O link deve pertencer à Amazon Brasil, a.co ou amzn.to.");', 'if (amazonUrl.trim() && !isSupportedProductLink(amazonUrl.trim())) return toast.error("O link deve pertencer à Amazon, Shopee, Mercado Livre ou Pichau.");')
change('amazon_url: amazonUrl.trim() || null,', 'amazon_url: amazonUrl.trim() && /https:\\/\\/(?:[^/]*\\.)?(?:amazon\\.com\\.br|a\\.co|amzn\\.to)(?:\\/|$)/i.test(amazonUrl.trim()) ? amazonUrl.trim() : null,\n        product_url: amazonUrl.trim() || null,')
change('Use um link da Amazon ou cadastre os dados manualmente.', 'Use links da Amazon, Shopee, Mercado Livre ou Pichau, ou cadastre manualmente.')
change('Link do produto na Amazon', 'Link do produto')
change('Cole aqui o link do produto da Amazon...', 'Cole o link da Amazon, Shopee, Mercado Livre ou Pichau...')
change('onClick={() => void searchAmazon()}', 'onClick={() => void searchProduct()}')
change('{item.amazon_url && <a className="button button-ghost button-small" href={item.amazon_url} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} /> Amazon</a>}', '{(item.product_url || item.amazon_url) && <a className="button button-ghost button-small" href={item.product_url || item.amazon_url || "#"} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} /> Ver produto</a>}')
change('A leitura de preços na Amazon é automática quando permitida pelo site.', 'A leitura de dados das lojas é automática quando permitida pelo site.')

type_source = types.read_text(encoding='utf-8')
if 'product_url: string | null;' not in type_source:
    if '  amazon_url: string | null;' not in type_source: raise SystemExit('ERRO: tipo GoalItem inesperado. Nenhum arquivo alterado.')
    type_source = type_source.replace('  amazon_url: string | null;', '  amazon_url: string | null;\n  product_url: string | null;')

# Only write after all expected source patterns were verified.
page.write_text(source, encoding='utf-8')
types.write_text(type_source, encoding='utf-8')
print('OK: tela Metas e tipos atualizados. Copie tambem a pasta app e execute a migracao SQL.')
