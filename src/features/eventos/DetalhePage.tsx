import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { acompanharEvento, deixarDeAcompanhar, denunciarEvento, obterEvento } from '../../api/eventos'
import { inscrever } from '../../api/inscricoes'
import type { EventoDetalhe } from '../../api/tipos'
import { Campo } from '../../components/Campo'
import { Carregando, Erro } from '../../components/Estados'
import { Icone } from '../../components/Icone'
import { LinhaDoTempo } from '../../components/LinhaDoTempo'
import { Modal } from '../../components/Modal'
import { Seletor } from '../../components/Seletor'
import { Selo, SeloStatusEvento } from '../../components/Selo'
import { useToast } from '../../components/Toasts'
import { dataLonga, dataEHora, hora, moeda, precoOuGratuito } from '../../lib/formatar'
import { mapearErro } from '../../lib/erros'
import { aplicarErrosDosCampos, useTitulo } from '../../lib/formulario'
import { denunciaSchema, MOTIVOS_DENUNCIA, type DenunciaForm } from '../../schemas/gestao'
import { useSessao } from '../auth/sessao'

/** "12 de novembro de 2026 • 19h às 22h" (ou início e fim completos quando passam de um dia). */
function periodo(inicio: string, fim: string) {
  const mesmoDia = new Date(inicio).toDateString() === new Date(fim).toDateString()
  return mesmoDia ? `${dataLonga(inicio)} • ${hora(inicio)} às ${hora(fim)}` : `${dataEHora(inicio)} até ${dataEHora(fim)}`
}

function inscricoesAbertas(e: EventoDetalhe, agora = new Date()) {
  return e.status === 'PUBLICADO' && agora >= new Date(e.inscricaoInicio) && agora <= new Date(e.inscricaoFim) && (e.vagasRestantes === null || e.vagasRestantes > 0)
}

function motivoFechado(e: EventoDetalhe, agora = new Date()) {
  if (e.status === 'CANCELADO') return 'Evento cancelado'
  if (e.status === 'ENCERRADO') return 'Evento encerrado'
  if (e.status !== 'PUBLICADO') return 'Inscrições indisponíveis'
  if (agora < new Date(e.inscricaoInicio)) return `Inscrições a partir de ${dataEHora(e.inscricaoInicio)}`
  if (agora > new Date(e.inscricaoFim)) return 'Inscrições encerradas'
  if (e.vagasRestantes === 0) return 'Evento lotado'
  return null
}

const ROTULO_CAMPO: Record<string, string> = {
  titulo: 'Título',
  dataInicio: 'Início',
  dataFim: 'Término',
  local: 'Local',
  programacao: 'Programação',
  preco: 'Preço',
  capacidade: 'Capacidade',
}

function DenunciaModal({ eventoId, aoFechar }: { eventoId: string; aoFechar: () => void }) {
  const [enviada, setEnviada] = useState(false)
  const [mensagem, setMensagem] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<DenunciaForm>({ resolver: zodResolver(denunciaSchema), defaultValues: { descricao: '' } })

  const motivoEscolhido = useWatch({ control, name: 'motivo' })

  const enviar = handleSubmit(async ({ motivo, descricao }) => {
    setMensagem(null)
    try {
      await denunciarEvento(eventoId, motivo, descricao)
      setEnviada(true)
    } catch (e) {
      const erro = mapearErro(e)
      if (!aplicarErrosDosCampos(erro, setError, ['motivo', 'descricao'])) setMensagem(erro.mensagem)
    }
  })

  return (
    <Modal
      titulo="Denunciar evento"
      aoFechar={aoFechar}
      acoes={
        enviada ? (
          <button type="button" className="botao" onClick={aoFechar}>
            Fechar
          </button>
        ) : (
          <>
            <button type="button" className="botao botao--contorno" onClick={aoFechar}>
              Cancelar
            </button>
            <button type="submit" form="form-denuncia" className="botao" disabled={isSubmitting}>
              {isSubmitting ? 'Enviando…' : 'Enviar denúncia'}
            </button>
          </>
        )
      }
    >
      {enviada ? (
        <p className="alerta alerta--sucesso">Denúncia enviada. Obrigado por ajudar a manter o Viteme confiável.</p>
      ) : (
        <form id="form-denuncia" className="formulario" onSubmit={enviar} noValidate>
          {mensagem && (
            <p className="alerta alerta--erro" role="alert">
              {mensagem}
            </p>
          )}
          <Campo rotulo="Motivo" erro={errors.motivo?.message}>
            {(a) => (
              <Controller
                control={control}
                name="motivo"
                render={({ field }) => (
                  <Seletor
                    {...a}
                    ref={field.ref}
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    placeholder="Selecione um motivo"
                    opcoes={MOTIVOS_DENUNCIA.map(([valor, rotulo]) => ({ valor, rotulo }))}
                  />
                )}
              />
            )}
          </Campo>
          <Campo rotulo={motivoEscolhido === 'OUTRO' ? 'Descrição' : 'Descrição (opcional)'} erro={errors.descricao?.message} ajuda="Até 500 caracteres.">
            {(a) => <textarea className="entrada" maxLength={500} {...a} {...register('descricao')} />}
          </Campo>
        </form>
      )}
    </Modal>
  )
}

export function DetalhePage() {
  const { id = '' } = useParams()
  const { estado } = useSessao()
  const navegar = useNavigate()
  const local = useLocation()
  const queryClient = useQueryClient()
  const [denunciando, setDenunciando] = useState(false)
  const [mensagem, setMensagem] = useState<string | null>(null)
  const toast = useToast()

  const consulta = useQuery({ queryKey: ['evento', id], queryFn: () => obterEvento(id), retry: false })
  const evento = consulta.data?.evento
  useTitulo(evento?.titulo ?? 'Detalhes do evento')

  const logado = estado === 'autenticado'
  const irParaLogin = () => navegar('/entrar', { state: { de: `${local.pathname}${local.search}` } })

  const inscricao = useMutation({
    mutationFn: () => inscrever(id),
    onSuccess: (criada) => {
      void queryClient.invalidateQueries({ queryKey: ['evento', id] })
      void queryClient.invalidateQueries({ queryKey: ['eventos'] })
      void queryClient.invalidateQueries({ queryKey: ['inscricoes'] })
      if (criada.pagamento) navegar(`/inscricoes/${criada.id}/pagamento`)
      else navegar('/minhas-inscricoes', { state: { novaInscricao: criada.codigoCheckin } })
    },
    onError: (e) => setMensagem(mapearErro(e).mensagem),
  })

  const interesse = useMutation({
    mutationFn: (acompanhar: boolean) => (acompanhar ? acompanharEvento(id) : deixarDeAcompanhar(id)),
    onSuccess: (_, acompanhar) => {
      void queryClient.invalidateQueries({ queryKey: ['evento', id] })
      toast.sucesso(acompanhar ? 'Pronto! Você vai receber os avisos deste evento.' : 'Você deixou de acompanhar este evento.')
    },
    onError: (e) => setMensagem(mapearErro(e).mensagem),
  })

  if (consulta.isPending) {
    return (
      <main className="pagina pagina--media" id="conteudo">
        <Carregando />
      </main>
    )
  }

  if (consulta.isError || !evento) {
    const erro = mapearErro(consulta.error)
    return (
      <main className="pagina pagina--media" id="conteudo">
        {erro.status === 404 ? (
          <div className="estado">
            <div className="estado__icone" aria-hidden="true">
              ?
            </div>
            <strong>Evento indisponível</strong>
            <p>Este evento não existe ou não está mais disponível para você.</p>
            <Link to="/" className="botao botao--secundario">
              Ver outros eventos
            </Link>
          </div>
        ) : (
          <Erro erro={erro} aoTentarNovamente={() => consulta.refetch()} />
        )}
      </main>
    )
  }

  const gestor = evento.souOrganizador || evento.souColaborador
  // Colaborador também pode se inscrever (D52 da API); só o organizador não.
  const podeSeInscrever = !evento.souOrganizador
  const minha = evento.minhaInscricao
  const inscritoAtivo = minha && (minha.status === 'CONFIRMADA' || minha.status === 'PENDENTE_PAGAMENTO')
  const abertas = inscricoesAbertas(evento)
  const fechado = motivoFechado(evento)
  const alteracoes = evento.ultimasAlteracoes
  const rotuloInscrever = evento.preco > 0 ? `Inscrever-se por ${moeda(evento.preco)}` : 'Inscrever-se gratuitamente'

  return (
    <main className="pagina pagina--media" id="conteudo">
      <div className="linha linha--entre">
        <h1 className="pagina__titulo">Detalhes do evento</h1>
      </div>
      <div className="linha espaco-topo">
        {evento.status === 'PUBLICADO' ? <Selo>{abertas ? 'Inscrições abertas' : (fechado ?? 'Publicado')}</Selo> : <SeloStatusEvento status={evento.status} />}
        {alteracoes.length > 0 && <Selo tom="aviso">Alterado</Selo>}
        <Selo tom="neutro">{evento.categoria}</Selo>
      </div>

      {mensagem && (
        <p className="alerta alerta--erro espaco-topo" role="alert">
          {mensagem}
        </p>
      )}

      <article className="pilha pilha--grande espaco-topo">
        <section className="cartao cartao--destaque">
          {evento.imagemUrl && <img src={evento.imagemUrl} alt="" style={{ width: '100%', maxHeight: 260, objectFit: 'cover', borderRadius: 10, marginBottom: 16 }} />}
          <h2 className="detalhe__titulo">{evento.titulo}</h2>
          <ul className="detalhe__meta">
            <li>
              <Icone nome="eventos" tamanho={18} />
              {periodo(evento.dataInicio, evento.dataFim)}
            </li>
            <li>
              <Icone nome="local" tamanho={18} />
              {evento.local}
            </li>
            <li>
              <Icone nome="cartao" tamanho={18} />
              {precoOuGratuito(evento.preco)}
            </li>
          </ul>
          <p className="espaco-topo" style={{ whiteSpace: 'pre-line' }}>
            {evento.descricao}
          </p>
        </section>

        {alteracoes.length > 0 && (
          <section className="cartao" style={{ borderColor: '#f1d9a0', background: '#fffaf0' }} aria-label="Alterações recentes">
            <h2 className="cartao__titulo">Este evento foi alterado</h2>
            <ul className="lista-simples">
              {alteracoes.slice(0, 3).map((a, i) => (
                <li key={`${a.campo}-${i}`}>
                  <strong>{ROTULO_CAMPO[a.campo] ?? a.campo}</strong>
                  {a.valorAnterior && a.valorNovo && (
                    <span className="texto-suave">
                      {' '}
                      — de “{a.valorAnterior}” para “{a.valorNovo}”
                    </span>
                  )}
                  <p className="texto-suave texto-pequeno">
                    {a.motivo} · {dataEHora(a.criadoEm)}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="cartao">
          <h2 className="cartao__titulo">Informações do evento</h2>
          <dl className="fatos">
            <div>
              <dt>Local</dt>
              <dd>{evento.local}</dd>
            </div>
            <div>
              <dt>Vagas</dt>
              <dd>
                {evento.capacidade === null ? 'Ilimitadas' : `${evento.capacidade} vagas`}
                {evento.vagasRestantes !== null && evento.capacidade !== null && <span className="texto-suave"> · {evento.vagasRestantes} restantes</span>}
              </dd>
            </div>
            {evento.cargaHoraria && (
              <div>
                <dt>Carga horária</dt>
                <dd>{evento.cargaHoraria}h</dd>
              </div>
            )}
            <div>
              <dt>Valor</dt>
              <dd>{precoOuGratuito(evento.preco)}</dd>
            </div>
            <div>
              <dt>Inscrições até</dt>
              <dd>{dataEHora(evento.inscricaoFim)}</dd>
            </div>
            <div>
              <dt>Organização</dt>
              <dd>{evento.organizador.nome}</dd>
            </div>
          </dl>
          {evento.preco > 0 && <p className="texto-suave texto-pequeno espaco-topo">Sem taxa da plataforma: você paga exatamente o valor do evento.</p>}
        </section>

        <section className="cartao">
          <h2 className="cartao__titulo">Programação</h2>
          {evento.atividades.length === 0 ? <p className="cartao__meta">A programação ainda não foi divulgada.</p> : <LinhaDoTempo atividades={evento.atividades} />}
        </section>

        <section className="pilha" aria-label="Ações">
          {gestor && (
            <>
              <p className="alerta">Você {evento.souOrganizador ? 'organiza' : 'colabora com'} este evento.</p>
              <Link to={`/meus-eventos/${evento.id}`} className="botao botao--bloco">
                <Icone nome="usuarios" tamanho={18} />
                Gerenciar evento
              </Link>
            </>
          )}
          {podeSeInscrever &&
            (inscritoAtivo ? (
              minha.status === 'CONFIRMADA' ? (
                <>
                  <p className="alerta alerta--sucesso">Você está inscrito neste evento.</p>
                  <Link to="/minhas-inscricoes" className={`botao botao--bloco${gestor ? ' botao--secundario' : ''}`}>
                    <Icone nome="qr" tamanho={18} />
                    Ver minha inscrição
                  </Link>
                </>
              ) : (
                <>
                  <p className="alerta alerta--aviso">Sua vaga está reservada. Conclua o pagamento para confirmar.</p>
                  <Link to={`/inscricoes/${minha.id}/pagamento`} className="botao botao--bloco">
                    <Icone nome="cartao" tamanho={18} />
                    Continuar pagamento
                  </Link>
                </>
              )
            ) : (
              <>
                {fechado && !abertas && <p className="alerta alerta--aviso">{fechado}.</p>}
                <button
                  type="button"
                  className={`botao botao--bloco${gestor ? ' botao--secundario' : ''}`}
                  disabled={inscricao.isPending || (logado && !abertas)}
                  onClick={() => (logado ? inscricao.mutate() : irParaLogin())}
                >
                  {!inscricao.isPending && <Icone nome="check" tamanho={18} />}
                  {inscricao.isPending ? 'Inscrevendo…' : logado ? rotuloInscrever : `Entre para se inscrever${evento.preco > 0 ? ` (${moeda(evento.preco)})` : ''}`}
                </button>
              </>
            ))}

          {evento.status === 'PUBLICADO' && (
            <button
              type="button"
              className="botao botao--secundario botao--bloco"
              disabled={interesse.isPending}
              aria-pressed={logado ? evento.interessado : undefined}
              onClick={() => (logado ? interesse.mutate(!evento.interessado) : irParaLogin())}
            >
              <Icone nome="estrela" tamanho={18} />
              {evento.interessado ? 'Deixar de acompanhar' : 'Acompanhar evento'}
            </button>
          )}

          {!gestor && (
            <button type="button" className="botao-link botao-link--discreto texto-pequeno" style={{ alignSelf: 'center' }} onClick={() => (logado ? setDenunciando(true) : irParaLogin())}>
              <Icone nome="bandeira" tamanho={16} />
              Denunciar este evento
            </button>
          )}
        </section>
      </article>

      {denunciando && <DenunciaModal eventoId={evento.id} aoFechar={() => setDenunciando(false)} />}
    </main>
  )
}
