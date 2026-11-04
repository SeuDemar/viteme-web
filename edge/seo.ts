/**
 * SEO e acesso por robôs (buscadores e IAs). Funções puras, usadas pelas Functions do Cloudflare Pages
 * (functions/index.ts, functions/eventos/[id].ts e functions/sitemap.xml.ts).
 *
 * Por quê: o site é um app de página única, então o HTML estático só tem <div id="root">. Quem não executa JavaScript
 * (a maioria dos robôs de IA e os geradores de prévia de links) não veria nada. As Functions devolvem o mesmo HTML do
 * site com título, descrição, Open Graph, dados estruturados (schema.org) e um resumo em <noscript> já preenchidos.
 * Todo texto vindo da API (título, descrição...) é escrito pelos usuários, então SEMPRE passa por escape.
 */

export interface ResumoSeo {
  id: string
  titulo: string
  categoria: string
  local: string
  dataInicio: string
  preco: number
}

export interface EventoSeo extends ResumoSeo {
  descricao: string
  imagemUrl: string | null
  dataFim: string
  status: string
  vagasRestantes: number | null
  organizador: { nome: string }
}

export interface PaginaSeo {
  titulo: string
  descricao: string
  url: string
  imagem: string
  jsonLd: object[]
  /** HTML (já escapado) mostrado só a quem não executa JavaScript. */
  corpo: string
  indexar?: boolean
}

export const DESCRICAO_PADRAO = 'Viteme: divulgação, inscrição e acompanhamento dos eventos da faculdade. Encontre palestras, workshops, cursos, feiras e seminários.'

export function escaparHtml(texto: string): string {
  return texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

/** JSON seguro dentro de <script type="application/ld+json">: impede que o texto feche a tag ou abra comentários. */
export function jsonParaScript(valor: unknown): string {
  return JSON.stringify(valor).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029')
}

/** Uma linha só, no máximo `max` caracteres, cortando numa palavra inteira. */
export function resumir(texto: string, max = 160): string {
  const limpo = texto.replace(/\s+/g, ' ').trim()
  if (limpo.length <= max) return limpo
  const corte = limpo.slice(0, max - 1)
  const ultimoEspaco = corte.lastIndexOf(' ')
  return `${(ultimoEspaco > max * 0.6 ? corte.slice(0, ultimoEspaco) : corte).trimEnd()}…`
}

const FORMATO_DATA = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Sao_Paulo' })
const dataLegivel = (iso: string) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : FORMATO_DATA.format(d)
}
const precoLegivel = (preco: number) => (preco > 0 ? `R$ ${preco.toFixed(2).replace('.', ',')}` : 'Gratuito')
const soHttps = (url: string | null | undefined) => (url && /^https:\/\//i.test(url) ? url : null)
const ehLink = (local: string) => /^https?:\/\//i.test(local.trim())

export function paginaDoEvento(e: EventoSeo, origem: string): PaginaSeo {
  const url = `${origem}/eventos/${encodeURIComponent(e.id)}`
  const imagem = soHttps(e.imagemUrl) ?? `${origem}/og.png`
  const quando = dataLegivel(e.dataInicio)
  const descricao = resumir(`${quando ? `${quando} · ` : ''}${e.local}. ${e.descricao}`)
  const cancelado = e.status === 'CANCELADO'
  const online = ehLink(e.local)

  const evento = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: e.titulo,
    description: resumir(e.descricao, 500),
    startDate: e.dataInicio,
    endDate: e.dataFim,
    eventStatus: cancelado ? 'https://schema.org/EventCancelled' : 'https://schema.org/EventScheduled',
    eventAttendanceMode: online ? 'https://schema.org/OnlineEventAttendanceMode' : 'https://schema.org/OfflineEventAttendanceMode',
    location: online ? { '@type': 'VirtualLocation', url: e.local.trim() } : { '@type': 'Place', name: e.local },
    image: [imagem],
    organizer: { '@type': 'Organization', name: e.organizador.nome },
    url,
    offers: {
      '@type': 'Offer',
      url,
      price: e.preco,
      priceCurrency: 'BRL',
      availability: e.vagasRestantes === 0 ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
    },
  }

  const corpo = `<main><h1>${escaparHtml(e.titulo)}</h1>
<p>${escaparHtml([e.categoria, quando, e.local, precoLegivel(e.preco)].filter(Boolean).join(' · '))}</p>
<p>${escaparHtml(e.descricao)}</p>
<p>Organização: ${escaparHtml(e.organizador.nome)}</p>
<p>Para se inscrever é preciso ativar o JavaScript. <a href="/">Ver todos os eventos do Viteme</a>.</p></main>`

  return { titulo: `${e.titulo} • Viteme`, descricao, url, imagem, jsonLd: [evento], corpo, indexar: true }
}

export function paginaDaHome(eventos: ResumoSeo[], origem: string): PaginaSeo {
  const site = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Viteme',
    url: `${origem}/`,
    inLanguage: 'pt-BR',
    description: DESCRICAO_PADRAO,
    potentialAction: { '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: `${origem}/?busca={termo}` }, 'query-input': 'required name=termo' },
  }
  const lista = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: eventos.map((e, i) => ({ '@type': 'ListItem', position: i + 1, url: `${origem}/eventos/${encodeURIComponent(e.id)}`, name: e.titulo })),
  }
  const itens = eventos
    .map((e) => `<li><a href="/eventos/${encodeURIComponent(e.id)}">${escaparHtml(e.titulo)}</a> — ${escaparHtml([e.categoria, dataLegivel(e.dataInicio), e.local, precoLegivel(e.preco)].filter(Boolean).join(' · '))}</li>`)
    .join('\n')
  const corpo = `<main><h1>Viteme: eventos da faculdade</h1>
<p>${escaparHtml(DESCRICAO_PADRAO)}</p>
${eventos.length ? `<h2>Próximos eventos</h2>\n<ul>\n${itens}\n</ul>` : '<p>Ainda não há eventos publicados.</p>'}
<p>Este site precisa de JavaScript para busca, inscrição e área do organizador.</p></main>`

  return { titulo: 'Viteme • Eventos da faculdade', descricao: DESCRICAO_PADRAO, url: `${origem}/`, imagem: `${origem}/og.png`, jsonLd: [site, lista], corpo, indexar: true }
}

function montarCabeca(p: PaginaSeo): string {
  const a = escaparHtml
  const linhas = [
    `<title>${a(p.titulo)}</title>`,
    `<meta name="description" content="${a(p.descricao)}" />`,
    `<meta name="robots" content="${p.indexar === false ? 'noindex,nofollow' : 'index,follow,max-image-preview:large'}" />`,
    `<link rel="canonical" href="${a(p.url)}" />`,
    `<meta property="og:type" content="${p.jsonLd.some((j) => (j as { '@type'?: string })['@type'] === 'Event') ? 'article' : 'website'}" />`,
    `<meta property="og:site_name" content="Viteme" />`,
    `<meta property="og:locale" content="pt_BR" />`,
    `<meta property="og:title" content="${a(p.titulo)}" />`,
    `<meta property="og:description" content="${a(p.descricao)}" />`,
    `<meta property="og:url" content="${a(p.url)}" />`,
    `<meta property="og:image" content="${a(p.imagem)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${a(p.titulo)}" />`,
    `<meta name="twitter:description" content="${a(p.descricao)}" />`,
    `<meta name="twitter:image" content="${a(p.imagem)}" />`,
    ...p.jsonLd.map((j) => `<script type="application/ld+json">${jsonParaScript(j)}</script>`),
  ]
  return linhas.join('\n    ')
}

/** Troca, no HTML do site, os blocos marcados em index.html (<!--seo:cabeca--> e <!--seo:corpo-->). Sem marcas, devolve o HTML como veio. */
export function injetarNoHtml(html: string, p: PaginaSeo): string {
  const bloco = (nome: string) => new RegExp(`<!--seo:${nome}-->[\\s\\S]*?<!--/seo:${nome}-->`)
  // Substituição por função: o texto injetado pode conter "$&" ou "$1", que `replace` com string interpretaria.
  return html
    .replace(bloco('cabeca'), () => `<!--seo:cabeca-->\n    ${montarCabeca(p)}\n    <!--/seo:cabeca-->`)
    .replace(bloco('corpo'), () => `<!--seo:corpo--><noscript>${p.corpo}</noscript><!--/seo:corpo-->`)
}

/** Páginas públicas fixas + um endereço por evento. */
export function montarSitemap(origem: string, ids: string[]): string {
  const caminhos = ['/', '/certificados', ...ids.map((id) => `/eventos/${encodeURIComponent(id)}`)]
  const urls = caminhos.map((c) => `  <url><loc>${escaparHtml(origem + c)}</loc></url>`).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
}
