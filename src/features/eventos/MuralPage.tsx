import { useInfiniteQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { listarEventos } from '../../api/eventos'
import { Carregando, Erro, Vazio } from '../../components/Estados'
import { EventoCard } from '../../components/EventoCard'
import { FILTROS_MURAL } from '../../lib/categorias'
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

  const eventos = consulta.data?.pages.flatMap((p) => p.itens) ?? []
  const filtrando = Boolean(buscaNaUrl || categoria || gratuito)

  return (
    <main className="pagina" id="conteudo">
      <h1 className="pagina__titulo">Descubra eventos</h1>
      <p className="pagina__sub">Eventos, palestras e experiências em um só lugar</p>

      <div className="campo espaco-topo">
        <label className="campo__rotulo" htmlFor="busca">
          Buscar eventos
        </label>
        <input id="busca" className="entrada" type="search" placeholder="Pesquisar por nome ou tema…" value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>

      <div className="chips espaco-topo" role="group" aria-label="Filtrar por categoria">
        {FILTROS_MURAL.map((f) => (
          <button key={f.rotulo} type="button" className="chip" aria-pressed={categoria === f.categoria} onClick={() => alternar('categoria', f.categoria)}>
            {f.rotulo}
          </button>
        ))}
        <button type="button" className="chip" aria-pressed={gratuito} onClick={() => alternar('gratuitos', gratuito ? undefined : '1')}>
          Gratuitos
        </button>
      </div>

      <h2 className="secao-titulo">Próximos eventos</h2>

      {consulta.isPending ? (
        <Carregando />
      ) : consulta.isError ? (
        <Erro erro={mapearErro(consulta.error)} aoTentarNovamente={() => consulta.refetch()} />
      ) : eventos.length === 0 ? (
        <Vazio titulo={filtrando ? 'Nenhum evento encontrado' : 'Ainda não há eventos publicados'}>
          {filtrando ? 'Tente outro termo ou limpe os filtros.' : 'Volte em breve para conferir as novidades.'}
        </Vazio>
      ) : (
        <>
          <ul className="lista-simples" style={{ gap: 14 }} aria-label="Eventos">
            {eventos.map((e) => (
              <li key={e.id} style={{ padding: 0, border: 0 }}>
                <EventoCard evento={e} />
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
