import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listarNotificacoes, marcarComoLida, marcarTodasComoLidas } from '../../api/notificacoes'
import type { Notificacao } from '../../api/tipos'
import { Carregando, Erro, Vazio } from '../../components/Estados'
import { dataEHora } from '../../lib/formatar'
import { mapearErro } from '../../lib/erros'
import { useTitulo } from '../../lib/formulario'

const TAMANHO = 20

export function NotificacoesPage() {
  useTitulo('Notificações')
  const [filtro, setFiltro] = useState<'todas' | 'nao-lidas'>('todas')
  const [mensagem, setMensagem] = useState<string | null>(null)
  const navegar = useNavigate()
  const queryClient = useQueryClient()
  const invalidar = () => queryClient.invalidateQueries({ queryKey: ['notificacoes'] })

  const consulta = useInfiniteQuery({
    queryKey: ['notificacoes', 'lista', filtro],
    queryFn: ({ pageParam }) => listarNotificacoes({ lidas: filtro === 'nao-lidas' ? false : undefined, pagina: pageParam, tamanhoPagina: TAMANHO }),
    initialPageParam: 1,
    getNextPageParam: (ultima) => (ultima.pagina * TAMANHO < ultima.total ? ultima.pagina + 1 : undefined),
  })

  const lida = useMutation({ mutationFn: marcarComoLida, onSuccess: invalidar })
  const todas = useMutation({
    mutationFn: marcarTodasComoLidas,
    onSuccess: invalidar,
    onError: (e) => setMensagem(mapearErro(e).mensagem),
  })

  const itens = consulta.data?.pages.flatMap((p) => p.itens) ?? []
  const naoLidas = consulta.data?.pages[0]?.naoLidas ?? 0

  const abrir = (n: Notificacao) => {
    if (!n.lida) lida.mutate(n.id)
    if (n.eventoId) navegar(`/eventos/${n.eventoId}`)
  }

  return (
    <main className="pagina pagina--media" id="conteudo">
      <div className="linha linha--entre">
        <h1 className="pagina__titulo">Notificações</h1>
        <button type="button" className="botao botao--secundario botao--pequeno" onClick={() => todas.mutate()} disabled={todas.isPending || naoLidas === 0}>
          Marcar todas como lidas
        </button>
      </div>

      <div className="abas espaco-topo" role="tablist" aria-label="Filtro">
        <button type="button" role="tab" className="aba" aria-selected={filtro === 'todas'} onClick={() => setFiltro('todas')}>
          Todas
        </button>
        <button type="button" role="tab" className="aba" aria-selected={filtro === 'nao-lidas'} onClick={() => setFiltro('nao-lidas')}>
          Não lidas{naoLidas > 0 ? ` (${naoLidas})` : ''}
        </button>
      </div>

      {mensagem && (
        <p className="alerta alerta--erro espaco-topo" role="alert">
          {mensagem}
        </p>
      )}

      <div className="espaco-topo">
        {consulta.isPending ? (
          <Carregando />
        ) : consulta.isError ? (
          <Erro erro={mapearErro(consulta.error)} aoTentarNovamente={() => consulta.refetch()} />
        ) : itens.length === 0 ? (
          <Vazio titulo={filtro === 'nao-lidas' ? 'Nenhuma notificação não lida' : 'Você ainda não tem notificações'}>
            Avisos sobre inscrições, pagamentos e alterações dos eventos aparecem aqui.
          </Vazio>
        ) : (
          <>
            <ul className="lista-simples" style={{ gap: 12 }}>
              {itens.map((n) => (
                <li key={n.id} style={{ padding: 0, border: 0 }}>
                  <button type="button" className={`cartao notificacao${n.lida ? '' : ' notificacao--nova'}`} onClick={() => abrir(n)}>
                    <span className="notificacao__ponto" aria-hidden="true" />
                    <span>
                      <span className="cartao__titulo" style={{ display: 'block' }}>
                        {n.titulo}
                        {!n.lida && <span className="sr-only"> (não lida)</span>}
                      </span>
                      <span className="cartao__meta" style={{ display: 'block' }}>
                        {n.mensagem}
                      </span>
                      <span className="texto-suave texto-pequeno" style={{ display: 'block', marginTop: 6 }}>
                        {dataEHora(n.criadoEm)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {consulta.hasNextPage && (
              <div className="linha espaco-topo" style={{ justifyContent: 'center' }}>
                <button type="button" className="botao botao--secundario" onClick={() => consulta.fetchNextPage()} disabled={consulta.isFetchingNextPage}>
                  {consulta.isFetchingNextPage ? 'Carregando…' : 'Carregar mais'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}
