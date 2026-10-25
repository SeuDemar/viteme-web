import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { baixarCertificado, cancelarInscricao, listarMinhasInscricoes } from '../../api/inscricoes'
import type { MinhaInscricao, SituacaoInscricoes } from '../../api/tipos'
import { Carregando, Erro, Vazio } from '../../components/Estados'
import { Confirmacao, Modal } from '../../components/Modal'
import { SeloStatusInscricao } from '../../components/Selo'
import { dataLonga, dataNumerica, hora, minutosRestantes, paraNomeDeArquivo } from '../../lib/formatar'
import { mapearErro } from '../../lib/erros'
import { useTitulo } from '../../lib/formulario'
import { useAgora } from '../../lib/useAgora'
import { useSessao } from '../auth/sessao'

function situacaoTexto(i: MinhaInscricao, agora: Date) {
  const quando = `${dataNumerica(i.evento.dataInicio)} • ${hora(i.evento.dataInicio)}`
  switch (i.status) {
    case 'CONFIRMADA':
      return `Inscrição confirmada • ${quando}`
    case 'PENDENTE_PAGAMENTO': {
      const min = i.reservadaAte ? minutosRestantes(i.reservadaAte, agora) : null
      return min ? `Pagamento pendente • Reserva válida por ${min} min` : 'Pagamento pendente • Reserva expirada'
    }
    case 'CANCELADA':
      return `Inscrição cancelada • ${quando}`
    case 'EXPIRADA':
      return `Reserva expirada • ${quando}`
  }
}

function Comprovante({ inscricao, aoFechar }: { inscricao: MinhaInscricao; aoFechar: () => void }) {
  const { usuario } = useSessao()
  return (
    <Modal
      titulo="Comprovante de inscrição"
      aoFechar={aoFechar}
      acoes={
        <>
          <button type="button" className="botao botao--contorno" onClick={() => window.print()}>
            Imprimir
          </button>
          <button type="button" className="botao" onClick={aoFechar}>
            Fechar
          </button>
        </>
      }
    >
      <div className="pilha">
        <div>
          <strong>{inscricao.evento.titulo}</strong>
          <p className="cartao__meta">
            {dataLonga(inscricao.evento.dataInicio)} • {hora(inscricao.evento.dataInicio)} • {inscricao.evento.local}
          </p>
        </div>
        {usuario && <p className="texto-suave">Participante: {usuario.nome}</p>}
        <div>
          <p className="texto-pequeno texto-suave">Código de check-in</p>
          <span className="codigo">{inscricao.codigoCheckin}</span>
        </div>
        <p className="texto-suave texto-pequeno">Apresente este código na entrada do evento.</p>
      </div>
    </Modal>
  )
}

function ItemInscricao({ inscricao, agora, aoComprovante, aoCancelar }: { inscricao: MinhaInscricao; agora: Date; aoComprovante: () => void; aoCancelar: () => void }) {
  const [baixando, setBaixando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const futuro = new Date(inscricao.evento.dataInicio) > agora

  const baixar = async () => {
    setBaixando(true)
    setErro(null)
    try {
      await baixarCertificado(inscricao.id, `certificado-${paraNomeDeArquivo(inscricao.evento.titulo)}.pdf`)
    } catch (e) {
      setErro(mapearErro(e).mensagem)
    } finally {
      setBaixando(false)
    }
  }

  return (
    <li style={{ padding: 0, border: 0 }}>
      <article className="cartao">
        <div className="linha linha--entre" style={{ alignItems: 'flex-start' }}>
          <div>
            <h3 className="cartao__titulo">
              <Link to={`/eventos/${inscricao.evento.id}`} style={{ color: 'inherit' }}>
                {inscricao.evento.titulo}
              </Link>
            </h3>
            <p className="cartao__meta">{situacaoTexto(inscricao, agora)}</p>
          </div>
          <SeloStatusInscricao status={inscricao.status} />
        </div>

        {inscricao.status === 'CONFIRMADA' && (
          <div className="linha espaco-topo" style={{ alignItems: 'center' }}>
            <div>
              <p className="texto-pequeno texto-suave">Código de check-in</p>
              <span className="codigo">{inscricao.codigoCheckin}</span>
            </div>
          </div>
        )}

        {erro && (
          <p className="alerta alerta--erro espaco-topo" role="alert">
            {erro}
          </p>
        )}

        <div className="linha espaco-topo">
          {inscricao.status === 'CONFIRMADA' && (
            <button type="button" className="botao botao--pequeno" onClick={aoComprovante}>
              Ver comprovante
            </button>
          )}
          {inscricao.status === 'PENDENTE_PAGAMENTO' && (
            <Link to={`/inscricoes/${inscricao.id}/pagamento`} className="botao botao--secundario botao--pequeno">
              Continuar pagamento
            </Link>
          )}
          {inscricao.certificadoDisponivel && (
            <button type="button" className="botao botao--secundario botao--pequeno" onClick={baixar} disabled={baixando}>
              {baixando ? 'Gerando…' : 'Baixar certificado'}
            </button>
          )}
          {(inscricao.status === 'CONFIRMADA' || inscricao.status === 'PENDENTE_PAGAMENTO') && futuro && (
            <button type="button" className="botao botao--perigo botao--pequeno" onClick={aoCancelar}>
              Cancelar inscrição
            </button>
          )}
        </div>
      </article>
    </li>
  )
}

export function MinhasInscricoesPage() {
  useTitulo('Minhas inscrições')
  const local = useLocation()
  const novaInscricao = (local.state as { novaInscricao?: string | null; pagamentoAprovado?: boolean } | null) ?? null
  const [situacao, setSituacao] = useState<Extract<SituacaoInscricoes, 'proximas' | 'passadas'>>('proximas')
  const [comprovante, setComprovante] = useState<MinhaInscricao | null>(null)
  const [cancelando, setCancelando] = useState<MinhaInscricao | null>(null)
  const [aviso, setAviso] = useState<{ tom: 'sucesso' | 'erro'; texto: string } | null>(null)
  const agora = useAgora()
  const queryClient = useQueryClient()

  const consulta = useQuery({ queryKey: ['inscricoes', 'minhas', situacao], queryFn: () => listarMinhasInscricoes(situacao) })

  const cancelar = useMutation({
    mutationFn: (i: MinhaInscricao) => cancelarInscricao(i.id),
    onSuccess: (resposta) => {
      setAviso({ tom: 'sucesso', texto: resposta.estornoSolicitado ? 'Inscrição cancelada. O estorno do pagamento foi solicitado.' : 'Inscrição cancelada.' })
      void queryClient.invalidateQueries({ queryKey: ['inscricoes'] })
      void queryClient.invalidateQueries({ queryKey: ['evento'] })
      void queryClient.invalidateQueries({ queryKey: ['eventos'] })
    },
    onError: (e) => setAviso({ tom: 'erro', texto: mapearErro(e).mensagem }),
    onSettled: () => setCancelando(null),
  })

  return (
    <main className="pagina pagina--media" id="conteudo">
      <h1 className="pagina__titulo">Minhas inscrições</h1>

      {novaInscricao?.novaInscricao && !aviso && (
        <p className="alerta alerta--sucesso espaco-topo" role="status">
          Inscrição confirmada! Seu código de check-in é <strong>{novaInscricao.novaInscricao}</strong>.
        </p>
      )}
      {novaInscricao?.pagamentoAprovado && !aviso && (
        <p className="alerta alerta--sucesso espaco-topo" role="status">
          Pagamento aprovado! Sua inscrição está confirmada.
        </p>
      )}
      {aviso && (
        <p className={`alerta alerta--${aviso.tom} espaco-topo`} role={aviso.tom === 'erro' ? 'alert' : 'status'}>
          {aviso.texto}
        </p>
      )}

      <div className="abas espaco-topo" role="tablist" aria-label="Período">
        {(['proximas', 'passadas'] as const).map((s) => (
          <button key={s} type="button" role="tab" className="aba" aria-selected={situacao === s} onClick={() => setSituacao(s)}>
            {s === 'proximas' ? 'Próximas' : 'Anteriores'}
          </button>
        ))}
      </div>

      <div className="espaco-topo">
        {consulta.isPending ? (
          <Carregando />
        ) : consulta.isError ? (
          <Erro erro={mapearErro(consulta.error)} aoTentarNovamente={() => consulta.refetch()} />
        ) : consulta.data.length === 0 ? (
          <Vazio
            titulo={situacao === 'proximas' ? 'Você não tem inscrições próximas' : 'Nenhuma inscrição anterior'}
            acao={
              situacao === 'proximas' && (
                <Link to="/" className="botao botao--secundario">
                  Explorar eventos
                </Link>
              )
            }
          >
            {situacao === 'proximas' ? 'Encontre um evento e garanta sua vaga.' : 'Os eventos de que você participou aparecem aqui.'}
          </Vazio>
        ) : (
          <ul className="lista-simples" style={{ gap: 14 }}>
            {consulta.data.map((i) => (
              <ItemInscricao key={i.id} inscricao={i} agora={agora} aoComprovante={() => setComprovante(i)} aoCancelar={() => setCancelando(i)} />
            ))}
          </ul>
        )}
      </div>

      {comprovante && <Comprovante inscricao={comprovante} aoFechar={() => setComprovante(null)} />}
      {cancelando && (
        <Confirmacao
          titulo="Cancelar inscrição?"
          mensagem={`Você perderá a vaga em “${cancelando.evento.titulo}”. O cancelamento só é possível até 24 horas antes do início e, se houver pagamento aprovado, o estorno é integral.`}
          rotuloConfirmar="Cancelar inscrição"
          perigo
          carregando={cancelar.isPending}
          aoConfirmar={() => cancelar.mutate(cancelando)}
          aoFechar={() => setCancelando(null)}
        />
      )}
    </main>
  )
}
