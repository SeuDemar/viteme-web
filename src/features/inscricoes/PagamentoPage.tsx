import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { consultarPagamento, gerarCobranca, listarMinhasInscricoes, simularPagamento } from '../../api/inscricoes'
import { Carregando, Erro } from '../../components/Estados'
import { SeloStatusPagamento } from '../../components/Selo'
import { dataCurta, hora, minutosRestantes, moeda } from '../../lib/formatar'
import { mapearErro } from '../../lib/erros'
import { useTitulo } from '../../lib/formulario'
import { useAgora } from '../../lib/useAgora'

const INTERVALO_MS = Number(import.meta.env.VITE_POLL_PAGAMENTO_MS ?? 5_000)
const LIMITE_MS = 2 * 60_000
const SIMULADOR = import.meta.env.VITE_SIMULADOR_PAGAMENTO === 'true'

/** O id da transação do gateway stub é o último trecho da URL de pagamento. */
const idTransacao = (url: string | null) => url?.split('/').filter(Boolean).pop() ?? null

export function PagamentoPage() {
  useTitulo('Pagamento')
  const { id = '' } = useParams()
  const navegar = useNavigate()
  const queryClient = useQueryClient()
  const agora = useAgora(15_000)
  const [inicio] = useState(() => Date.now())
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [esgotado, setEsgotado] = useState(false)

  const inscricoes = useQuery({ queryKey: ['inscricoes', 'minhas', 'todas'], queryFn: () => listarMinhasInscricoes('todas') })
  const inscricao = inscricoes.data?.find((i) => i.id === id)

  // Ao voltar do gateway: consulta E30 a cada 5 s por até 2 minutos (PDF, 5.4.2).
  const pagamento = useQuery({
    queryKey: ['pagamento', id],
    queryFn: () => consultarPagamento(id),
    retry: false,
    refetchInterval: (consulta) => {
      if (consulta.state.data?.status !== 'PENDENTE') return false
      if (Date.now() - inicio >= LIMITE_MS) return false
      return INTERVALO_MS
    },
  })

  const status = pagamento.data?.status
  useEffect(() => {
    if (status === 'APROVADO') {
      void queryClient.invalidateQueries({ queryKey: ['inscricoes'] })
      navegar('/minhas-inscricoes', { replace: true, state: { pagamentoAprovado: true } })
    }
  }, [status, navegar, queryClient])

  useEffect(() => {
    if (status !== 'PENDENTE') return
    const restante = LIMITE_MS - (Date.now() - inicio)
    const t = setTimeout(() => setEsgotado(true), Math.max(restante, 0))
    return () => clearTimeout(t)
  }, [status, inicio])

  const cobranca = useMutation({
    mutationFn: () => gerarCobranca(id),
    onError: (e) => {
      const erro = mapearErro(e)
      if (erro.codigo === 'PAGAMENTO_JA_APROVADO') {
        navegar('/minhas-inscricoes', { replace: true })
        return
      }
      setMensagem(erro.mensagem)
    },
  })

  const irParaPagamento = async () => {
    setMensagem(null)
    const resultado = await cobranca.mutateAsync().catch(() => null)
    if (resultado?.urlPagamento) window.location.assign(resultado.urlPagamento)
    else if (resultado) setMensagem('A cobrança foi criada, mas o endereço de pagamento ainda não está disponível. Tente novamente em instantes.')
  }

  const simular = useMutation({
    mutationFn: async (resultado: 'aprovar' | 'recusar') => {
      const cobrancaAtual = await gerarCobranca(id)
      const transacao = idTransacao(cobrancaAtual.urlPagamento)
      if (!transacao) throw new Error('sem transação')
      await simularPagamento(transacao, resultado)
    },
    onSuccess: () => void pagamento.refetch(),
    onError: (e) => setMensagem(mapearErro(e).mensagem),
  })

  if (inscricoes.isPending) {
    return (
      <main className="pagina pagina--estreita" id="conteudo">
        <Carregando />
      </main>
    )
  }

  if (inscricoes.isError) {
    return (
      <main className="pagina pagina--estreita" id="conteudo">
        <Erro erro={mapearErro(inscricoes.error)} aoTentarNovamente={() => inscricoes.refetch()} />
      </main>
    )
  }

  if (!inscricao) {
    return (
      <main className="pagina pagina--estreita" id="conteudo">
        <div className="estado">
          <strong>Inscrição não encontrada</strong>
          <p>Esta inscrição não existe ou não é sua.</p>
          <Link to="/minhas-inscricoes" className="botao botao--secundario">
            Minhas inscrições
          </Link>
        </div>
      </main>
    )
  }

  const minutos = inscricao.reservadaAte ? minutosRestantes(inscricao.reservadaAte, agora) : null
  const reservaExpirada = inscricao.status === 'EXPIRADA' || (inscricao.status === 'PENDENTE_PAGAMENTO' && minutos === null)
  const recusado = status === 'RECUSADO' || status === 'EXPIRADO'
  const valor = pagamento.data?.valor

  return (
    <main className="pagina pagina--estreita" id="conteudo">
      <h1 className="pagina__titulo">Pagamento</h1>

      <div className="pilha espaco-topo">
        <section className="cartao">
          <h2 className="cartao__titulo">Resumo da inscrição</h2>
          <p className="cartao__meta">
            {inscricao.evento.titulo} • {dataCurta(inscricao.evento.dataInicio)} • {hora(inscricao.evento.dataInicio)}
          </p>
        </section>

        <section className="cartao cartao--destaque">
          <h2 className="cartao__titulo">Total do evento</h2>
          <p style={{ fontSize: 30, fontWeight: 700, margin: '6px 0 2px' }}>{valor !== undefined ? moeda(valor) : '—'}</p>
          <p className="cartao__meta">Sem taxa de plataforma</p>
        </section>

        <div className="linha">{status ? <SeloStatusPagamento status={status} /> : <span className="selo selo--aviso">Aguardando pagamento</span>}</div>

        {reservaExpirada ? (
          <>
            <p className="alerta alerta--erro" role="alert">
              A reserva expirou e a vaga foi liberada. Faça uma nova inscrição para tentar de novo.
            </p>
            <Link to={`/eventos/${inscricao.evento.id}`} className="botao botao--bloco">
              Voltar ao evento
            </Link>
          </>
        ) : (
          <>
            <p className="texto-suave">
              Sua vaga ficará reservada por 30 minutos{minutos ? ` (restam ${minutos} min)` : ''}. O pagamento é processado por parceiro externo.
            </p>
            {recusado && (
              <p className="alerta alerta--erro" role="alert">
                {status === 'RECUSADO' ? 'O pagamento foi recusado.' : 'A cobrança expirou.'} Você pode tentar de novo enquanto a reserva estiver válida.
              </p>
            )}
            {esgotado && status === 'PENDENTE' && (
              <p className="alerta alerta--aviso" role="status">
                A confirmação pode levar alguns minutos. Quando o pagamento for aprovado, ele aparecerá em <Link to="/minhas-inscricoes">Minhas inscrições</Link>.
              </p>
            )}
            {mensagem && (
              <p className="alerta alerta--erro" role="alert">
                {mensagem}
              </p>
            )}
            <button type="button" className="botao botao--bloco" onClick={irParaPagamento} disabled={cobranca.isPending}>
              {cobranca.isPending ? 'Abrindo pagamento…' : recusado ? 'Tentar pagamento novamente' : 'Ir para pagamento'}
            </button>
            <button type="button" className="botao botao--secundario botao--bloco" onClick={() => pagamento.refetch()} disabled={pagamento.isFetching}>
              {pagamento.isFetching ? 'Consultando…' : 'Consultar status'}
            </button>
            {SIMULADOR && (
              <section className="cartao" style={{ borderStyle: 'dashed' }} aria-label="Simulador de pagamento (demonstração)">
                <h2 className="cartao__titulo">Modo demonstração</h2>
                <p className="cartao__meta">O gateway está simulado. Use os botões para aprovar ou recusar a cobrança.</p>
                <div className="linha espaco-topo">
                  <button type="button" className="botao botao--pequeno" onClick={() => simular.mutate('aprovar')} disabled={simular.isPending}>
                    Simular pagamento aprovado
                  </button>
                  <button type="button" className="botao botao--perigo botao--pequeno" onClick={() => simular.mutate('recusar')} disabled={simular.isPending}>
                    Simular recusa
                  </button>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  )
}
