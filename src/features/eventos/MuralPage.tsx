import { useInfiniteQuery } from '@tanstack/react-query'
import { useEffect, useState, type CSSProperties } from 'react'
import { useSearchParams } from 'react-router-dom'
import { listarEventos } from '../../api/eventos'
import { CarregandoCards, Erro, Vazio } from '../../components/Estados'
import { EventoCard } from '../../components/EventoCard'
import { Icone } from '../../components/Icone'
import { FILTROS_MURAL, tomDaCategoria } from '../../lib/categorias'
import { comDestaqueNaFrente, escolherDestaque } from '../../lib/destaque'
import { mapearErro } from '../../lib/erros'
import { useTitulo } from '../../lib/formulario'

export function MuralPage() {
  useTitulo('Explorar eventos')
  const [params, setParams] = useSearchParams()
  const categoria = params.get('categoria') ?? undefined
  const gratuito = params.get('gratuitos') === '1'
  const buscaNaUrl = params.get('busca') ?? ''
  const [busca, setBusca] = useState(buscaNaUrl)

  // A busca vai para a URL depois de uma pausa na digitação, para não consultar a API a cada tecla.
  useEffect(() => {
    if (busca === buscaNaUrl) return
    const espera = setTimeout(() => {
      setParams(
        (atual) => {
          const novo = new URLSearchParams(atual)
          if (busca.trim()) novo.set('busca', busca.trim())
          else novo.delete('busca')
          return novo
        },
        { replace: true },
      )
    }, 350)
    return () => clearTimeout(espera)
  }, [busca, buscaNaUrl, setParams])

  const alternar = (chave: string, valor?: string) =>
    setParams((atual) => {
      const novo = new URLSearchParams(atual)
      if (valor) novo.set(chave, valor)
      else novo.delete(chave)
      return novo
    })

  const consulta = useInfiniteQuery({
    queryKey: ['eventos', { busca: buscaNaUrl, categoria, gratuito }],
    queryFn: ({ pageParam }) => listarEventos({ busca: buscaNaUrl, categoria, gratuito, pagina: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (ultima) => (ultima.pagina * ultima.tamanhoPagina < ultima.total ? ultima.pagina + 1 : undefined),
  })

  const paginas = consulta.data?.pages ?? []
  const filtrando = Boolean(buscaNaUrl || categoria || gratuito)
  const total = consulta.data?.pages[0]?.total
  // Sem filtros, um evento da primeira página vira "Em destaque" (duas colunas, no topo da grade). A escolha é
  // automática: inscrições abertas e com vagas, de preferência com imagem, e o que começa primeiro.
  const indiceDestaque = !filtrando && paginas[0] ? escolherDestaque(paginas[0].itens) : -1
  const primeiraPagina = indiceDestaque >= 0 ? comDestaqueNaFrente(paginas[0]!.itens, indiceDestaque) : (paginas[0]?.itens ?? [])
  const eventos = [...primeiraPagina, ...paginas.slice(1).flatMap((p) => p.itens)]
  const comDestaque = indiceDestaque >= 0

  return (
    <main className="pagina" id="conteudo">
      <section className="hero" aria-labelledby="titulo-mural">
        <h1 className="pagina__titulo" id="titulo-mural">
          Descubra eventos
        </h1>
        <p className="pagina__sub">Eventos, palestras e experiências em um só lugar</p>

        <div className="campo hero__busca">
          <label className="sr-only" htmlFor="busca">
            Buscar eventos
          </label>
          <div className="entrada-com-icone">
            <Icone nome="busca" tamanho={20} />
            <input id="busca" className="entrada" type="search" placeholder="Pesquisar por nome ou tema…" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
        </div>

        {total !== undefined && total > 0 && (
          <p className="hero__numeros">
            <span>{total === 1 ? '1 evento para explorar' : `${total} eventos para explorar`}</span>
          </p>
        )}
      </section>

      <div className="chips espaco-topo" role="group" aria-label="Filtrar por categoria">
        {FILTROS_MURAL.map((f) => (
          <button key={f.rotulo} type="button" className="chip" aria-pressed={categoria === f.categoria} onClick={() => alternar('categoria', f.categoria)}>
            {f.categoria && <span className={`chip__ponto chip__ponto--${tomDaCategoria(f.categoria)}`} aria-hidden="true" />}
            {f.rotulo}
          </button>
        ))}
        <button type="button" className="chip" aria-pressed={gratuito} onClick={() => alternar('gratuitos', gratuito ? undefined : '1')}>
          Gratuitos
        </button>
      </div>

      <h2 className="secao-titulo">Próximos eventos</h2>

      {consulta.isPending ? (
        <CarregandoCards />
      ) : consulta.isError ? (
        <Erro erro={mapearErro(consulta.error)} aoTentarNovamente={() => consulta.refetch()} />
      ) : eventos.length === 0 ? (
        <Vazio titulo={filtrando ? 'Nenhum evento encontrado' : 'Ainda não há eventos publicados'}>
          {filtrando ? 'Tente outro termo ou limpe os filtros.' : 'Volte em breve para conferir as novidades.'}
        </Vazio>
      ) : (
        <>
          <ul className="grade-eventos" aria-label="Eventos">
            {eventos.map((e, i) => (
              <li key={e.id} className={comDestaque && i === 0 ? 'destaque' : undefined} style={{ '--i': i } as CSSProperties}>
                <EventoCard evento={e} destaque={comDestaque && i === 0} />
              </li>
            ))}
          </ul>
          {consulta.hasNextPage && (
            <div className="linha espaco-topo" style={{ justifyContent: 'center' }}>
              <button type="button" className="botao botao--secundario" onClick={() => consulta.fetchNextPage()} disabled={consulta.isFetchingNextPage}>
                {consulta.isFetchingNextPage ? 'Carregando…' : 'Carregar mais eventos'}
              </button>
            </div>
          )}
        </>
      )}
    </main>
  )
}
