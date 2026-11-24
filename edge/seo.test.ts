import { afterEach, describe, expect, it, vi } from 'vitest'
import { escaparHtml, injetarNoHtml, jsonParaScript, montarSitemap, paginaDaHome, paginaDoEvento, resumir, type EventoSeo } from './seo'
import { onRequest as paginaEvento } from '../functions/eventos/[id]'
import { onRequest as paginaInicial } from '../functions/index'
import { onRequestGet as sitemap } from '../functions/sitemap.xml'

const CASCA = `<!doctype html><html><head><!--seo:cabeca--><title>Viteme</title><!--/seo:cabeca--></head><body><div id="root"></div><!--seo:corpo--><noscript>padrão</noscript><!--/seo:corpo--></body></html>`
const ID = '0b9b0f6e-5d0e-4c6d-9f5d-1f1f1f1f1f1f'
const ORIGEM = 'https://viteme-web.pages.dev'

type LdEvento = { eventStatus: string; eventAttendanceMode: string; offers: { availability: string }; location: { '@type': string } }

const evento = (parcial: Partial<EventoSeo> = {}): EventoSeo => ({
  id: ID,
  titulo: 'Semana Acadêmica de Tecnologia',
  descricao: 'Palestras e oficinas sobre IA.',
  categoria: 'Semana',
  local: 'Auditório principal',
  imagemUrl: null,
  dataInicio: '2026-11-12T22:00:00Z',
  dataFim: '2026-11-13T01:00:00Z',
  preco: 0,
  status: 'PUBLICADO',
  vagasRestantes: 24,
  organizador: { nome: 'Centro Acadêmico' },
  ...parcial,
})

afterEach(() => vi.unstubAllGlobals())

describe('escapes', () => {
  it('escaparHtml neutraliza tags e aspas', () => {
    expect(escaparHtml(`<img src=x onerror="a()"> & 'b'`)).toBe('&lt;img src=x onerror=&quot;a()&quot;&gt; &amp; &#39;b&#39;')
  })

  it('jsonParaScript não deixa o texto fechar a tag <script>', () => {
    const saida = jsonParaScript({ nome: '</script><script>alert(1)</script>' })
    expect(saida).not.toContain('</script>')
    expect(saida).not.toContain('<')
    expect(JSON.parse(saida).nome).toBe('</script><script>alert(1)</script>')
  })

  it('resumir corta em palavra inteira e respeita o limite', () => {
    const r = resumir('palavra '.repeat(40), 60)
    expect(r.length).toBeLessThanOrEqual(60)
    expect(r.endsWith('…')).toBe(true)
    expect(resumir('  curto   e   limpo ')).toBe('curto e limpo')
  })
})

describe('página do evento', () => {
  it('monta título, descrição, Open Graph e JSON-LD do tipo Event', () => {
    const p = paginaDoEvento(evento({ preco: 25 }), ORIGEM)
    expect(p.titulo).toBe('Semana Acadêmica de Tecnologia • Viteme')
    expect(p.url).toBe(`${ORIGEM}/eventos/${ID}`)
    expect(p.imagem).toBe(`${ORIGEM}/og.png`)
    const ld = p.jsonLd[0] as Record<string, unknown>
    expect(ld['@type']).toBe('Event')
    expect(ld.eventStatus).toBe('https://schema.org/EventScheduled')
    expect(ld.eventAttendanceMode).toBe('https://schema.org/OfflineEventAttendanceMode')
    expect(ld.offers).toMatchObject({ price: 25, priceCurrency: 'BRL', availability: 'https://schema.org/InStock' })
  })

  it('evento cancelado, esgotado ou on-line vira o estado certo no schema.org', () => {
    const ld = paginaDoEvento(evento({ status: 'CANCELADO', vagasRestantes: 0, local: 'https://meet.exemplo.com/sala' }), ORIGEM).jsonLd[0] as LdEvento
    expect(ld.eventStatus).toBe('https://schema.org/EventCancelled')
    expect(ld.offers.availability).toBe('https://schema.org/SoldOut')
    expect(ld.eventAttendanceMode).toBe('https://schema.org/OnlineEventAttendanceMode')
    expect(ld.location['@type']).toBe('VirtualLocation')
  })

  it('só usa imagem https; senão cai na imagem padrão do site', () => {
    expect(paginaDoEvento(evento({ imagemUrl: 'https://img.exemplo.com/a.jpg' }), ORIGEM).imagem).toBe('https://img.exemplo.com/a.jpg')
    expect(paginaDoEvento(evento({ imagemUrl: 'javascript:alert(1)' }), ORIGEM).imagem).toBe(`${ORIGEM}/og.png`)
    expect(paginaDoEvento(evento({ imagemUrl: 'http://inseguro.com/a.jpg' }), ORIGEM).imagem).toBe(`${ORIGEM}/og.png`)
  })

  it('texto malicioso do evento não vira HTML nem escapa do JSON-LD', () => {
    const mal = '"><script>alert(1)</script><b>$&'
    const html = injetarNoHtml(CASCA, paginaDoEvento(evento({ titulo: mal, descricao: mal, local: mal }), ORIGEM))
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).not.toMatch(/<b>\$&/)
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    // O único <script> permitido é o do JSON-LD, que não fecha antes da hora.
    expect((html.match(/<script/g) ?? []).length).toBe(1)
    expect((html.match(/<\/script>/g) ?? []).length).toBe(1)
  })
})

describe('injetarNoHtml', () => {
  it('troca os blocos marcados e mantém o resto da página', () => {
    const html = injetarNoHtml(CASCA, paginaDoEvento(evento(), ORIGEM))
    expect(html).toContain('<title>Semana Acadêmica de Tecnologia • Viteme</title>')
    expect(html).toContain(`<link rel="canonical" href="${ORIGEM}/eventos/${ID}" />`)
    expect(html).toContain('<meta property="og:type" content="article" />')
    expect(html).toContain('<noscript><main><h1>Semana Acadêmica de Tecnologia</h1>')
    expect(html).toContain('<div id="root"></div>')
    expect(html).not.toContain('padrão')
  })

  it('sem as marcas, devolve o HTML como veio', () => {
    expect(injetarNoHtml('<html><head></head></html>', paginaDoEvento(evento(), ORIGEM))).toBe('<html><head></head></html>')
  })
})

describe('página inicial e sitemap', () => {
  it('a home lista os eventos como links e declara WebSite com busca e ItemList', () => {
    const p = paginaDaHome([{ id: ID, titulo: 'Evento <b>1</b>', categoria: 'Palestra', local: 'Sala 1', dataInicio: '2026-11-12T22:00:00Z', preco: 10 }], ORIGEM)
    expect(p.corpo).toContain(`<a href="/eventos/${ID}">Evento &lt;b&gt;1&lt;/b&gt;</a>`)
    expect((p.jsonLd[0] as Record<string, unknown>)['@type']).toBe('WebSite')
    expect((p.jsonLd[1] as { itemListElement: unknown[] }).itemListElement).toHaveLength(1)
  })

  it('sem eventos, avisa em vez de deixar uma lista vazia', () => {
    expect(paginaDaHome([], ORIGEM).corpo).toContain('Ainda não há eventos publicados')
  })

  it('o sitemap tem as páginas fixas e um endereço por evento, com XML escapado', () => {
    const xml = montarSitemap(ORIGEM, [ID, 'a&b'])
    expect(xml).toContain(`<loc>${ORIGEM}/</loc>`)
    expect(xml).toContain(`<loc>${ORIGEM}/certificados</loc>`)
    expect(xml).toContain(`<loc>${ORIGEM}/eventos/${ID}</loc>`)
    expect(xml).toContain('a%26b')
    expect(xml).not.toContain('a&b')
  })
})

describe('Functions', () => {
  const assets = { fetch: async () => new Response(CASCA, { headers: { 'content-type': 'text/html' } }) }
  const env = { API_ORIGIN: 'https://api.exemplo.com/', ASSETS: assets }
  const ctx = (caminho: string, params = {}) => ({ request: new Request(`${ORIGEM}${caminho}`), env, params, next: async () => new Response('próximo') })

  it('/eventos/:id devolve o HTML com os dados do evento', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json(evento())))
    const r = await paginaEvento(ctx(`/eventos/${ID}`, { id: ID }))
    const html = await r.text()
    expect(r.headers.get('content-type')).toContain('text/html')
    expect(r.headers.get('cache-control')).toContain('s-maxage')
    expect(html).toContain('<title>Semana Acadêmica de Tecnologia • Viteme</title>')
  })

  it('/eventos/:id com API fora do ar ou com erro serve o HTML normal do site', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('rede') }))
    expect(await (await paginaEvento(ctx(`/eventos/${ID}`, { id: ID }))).text()).toBe(CASCA)
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 500 })))
    expect(await (await paginaEvento(ctx(`/eventos/${ID}`, { id: ID }))).text()).toBe(CASCA)
  })

  it('evento inexistente responde 404 de verdade, com o HTML do site', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 404 })))
    const r = await paginaEvento(ctx(`/eventos/${ID}`, { id: ID }))
    expect(r.status).toBe(404)
    expect(await r.text()).toBe(CASCA)
  })

  it('id fora do formato nem chega a consultar a API', async () => {
    const consulta = vi.fn()
    vi.stubGlobal('fetch', consulta)
    expect(await (await paginaEvento(ctx('/eventos/x', { id: '../../etc' }))).text()).toBe(CASCA)
    expect(consulta).not.toHaveBeenCalled()
  })

  it('/ lista os próximos eventos e, sem API, serve o HTML normal', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ itens: [{ id: ID, titulo: 'Evento 1', categoria: 'Palestra', local: 'Sala', dataInicio: '2026-11-12T22:00:00Z', preco: 0 }], total: 1 })))
    expect(await (await paginaInicial(ctx('/'))).text()).toContain(`<a href="/eventos/${ID}">Evento 1</a>`)
    vi.stubGlobal('fetch', vi.fn(async () => new Response('x', { status: 500 })))
    expect(await (await paginaInicial(ctx('/'))).text()).toBe(CASCA)
  })

  it('métodos que não são GET passam adiante', async () => {
    const r = await paginaInicial({ ...ctx('/'), request: new Request(`${ORIGEM}/`, { method: 'POST' }) })
    expect(await r.text()).toBe('próximo')
  })

  it('/sitemap.xml junta as páginas de todas as páginas da API e sobrevive à API fora do ar', async () => {
    const chamadas: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (u: string) => {
      chamadas.push(u)
      const pagina = Number(new URL(u).searchParams.get('pagina'))
      return Response.json({ itens: [{ id: `evento-${pagina}` }], total: 120 })
    }))
    const xml = await (await sitemap({ request: new Request(`${ORIGEM}/sitemap.xml`), env })).text()
    expect(chamadas).toHaveLength(3)
    expect(xml).toContain('/eventos/evento-1<')
    expect(xml).toContain('/eventos/evento-3<')

    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('rede') }))
    const so = await (await sitemap({ request: new Request(`${ORIGEM}/sitemap.xml`), env })).text()
    expect(so).toContain(`<loc>${ORIGEM}/</loc>`)
    expect(so).not.toContain('/eventos/')
  })
})
