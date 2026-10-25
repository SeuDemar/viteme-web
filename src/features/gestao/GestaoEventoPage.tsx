import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useParams } from 'react-router-dom'
import { adicionarColaborador, cancelarEvento, listarAlteracoes, listarColaboradores, obterEvento, publicarEvento, removerColaborador } from '../../api/eventos'
import { listarInscritos, registrarCheckin } from '../../api/inscricoes'
import type { Colaborador, EventoDetalhe, StatusInscricao } from '../../api/tipos'
import { Campo } from '../../components/Campo'
import { Carregando, Erro, Vazio } from '../../components/Estados'
import { Confirmacao, Modal } from '../../components/Modal'
import { Selo, SeloStatusEvento, SeloStatusInscricao } from '../../components/Selo'
import { dataEHora, dataNumerica, hora } from '../../lib/formatar'
import { mapearErro } from '../../lib/erros'
import { aplicarErrosDosCampos, useTitulo } from '../../lib/formulario'
import { cancelamentoSchema, checkinSchema, colaboradorSchema, type CancelamentoForm, type CheckinForm, type ColaboradorForm } from '../../schemas/gestao'

type Aba = 'inscritos' | 'checkin' | 'colaboradores' | 'alteracoes'

const MENSAGENS_CHECKIN: Record<string, string> = {
  INSCRICAO_NAO_ENCONTRADA: 'Nenhuma inscrição com este código neste evento.',
  CHECKIN_JA_REALIZADO: 'O check-in deste código já foi realizado.',
  INSCRICAO_NAO_CONFIRMADA: 'A inscrição não está confirmada (pagamento pendente, cancelada ou expirada).',
  FORA_DO_HORARIO_DE_CHECKIN: 'O check-in só é permitido de 2 horas antes do início até o fim do evento.',
}

function AbaInscritos({ eventoId }: { eventoId: string }) {
  const [busca, setBusca] = useState('')
  const [status, setStatus] = useState('')
  const [pagina, setPagina] = useState(1)
  const consulta = useQuery({ queryKey: ['inscritos', eventoId, { busca, status, pagina }], queryFn: () => listarInscritos(eventoId, { busca, status, pagina }), placeholderData: (anterior) => anterior })
  const totalPaginas = consulta.data ? Math.max(1, Math.ceil(consulta.data.total / consulta.data.tamanhoPagina)) : 1

  return (
    <section className="cartao" aria-label="Lista de inscritos">
      <h2 className="cartao__titulo">Lista de inscritos</h2>
      <div className="formulario__grade espaco-topo">
        <Campo rotulo="Buscar por nome ou e-mail">
          {(a) => <input className="entrada" type="search" value={busca} onChange={(e) => (setBusca(e.target.value), setPagina(1))} {...a} />}
        </Campo>
        <Campo rotulo="Situação">
          {(a) => (
            <select className="entrada" value={status} onChange={(e) => (setStatus(e.target.value), setPagina(1))} {...a}>
              <option value="">Todas</option>
              <option value="CONFIRMADA">Confirmada</option>
              <option value="PENDENTE_PAGAMENTO">Pendente de pagamento</option>
              <option value="CANCELADA">Cancelada</option>
              <option value="EXPIRADA">Expirada</option>
            </select>
          )}
        </Campo>
      </div>

      <div className="espaco-topo">
        {consulta.isPending ? (
          <Carregando linhas={2} />
        ) : consulta.isError ? (
          <Erro erro={mapearErro(consulta.error)} aoTentarNovamente={() => consulta.refetch()} />
        ) : consulta.data.itens.length === 0 ? (
          <Vazio titulo="Nenhum inscrito encontrado">Quando houver inscrições, elas aparecem aqui.</Vazio>
        ) : (
          <>
            <table className="tabela">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Situação</th>
                  <th>Presença</th>
                </tr>
              </thead>
              <tbody>
                {consulta.data.itens.map((i) => (
                  <tr key={i.inscricaoId}>
                    <td>
                      <strong>{i.nome}</strong>
                    </td>
                    <td className="texto-suave">{i.email}</td>
                    <td>
                      <SeloStatusInscricao status={i.status as StatusInscricao} />
                    </td>
                    <td>{i.presencaConfirmada ? <Selo tom="sucesso">Presente {i.checkinEm ? `· ${hora(i.checkinEm)}` : ''}</Selo> : <span className="texto-suave">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="linha linha--entre espaco-topo">
              <span className="texto-suave texto-pequeno">
                {consulta.data.total} {consulta.data.total === 1 ? 'inscrição' : 'inscrições'} · página {consulta.data.pagina} de {totalPaginas}
              </span>
              <div className="linha">
                <button type="button" className="botao botao--contorno botao--pequeno" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>
                  Anterior
                </button>
                <button type="button" className="botao botao--contorno botao--pequeno" disabled={pagina >= totalPaginas} onClick={() => setPagina((p) => p + 1)}>
                  Próxima
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  )
}

function AbaCheckin({ eventoId }: { eventoId: string }) {
  const queryClient = useQueryClient()
  const [resultado, setResultado] = useState<{ tom: 'sucesso' | 'erro'; texto: string } | null>(null)
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CheckinForm>({ resolver: zodResolver(checkinSchema), defaultValues: { codigoCheckin: '' } })

  const enviar = handleSubmit(async ({ codigoCheckin }) => {
    setResultado(null)
    try {
      const r = await registrarCheckin(eventoId, codigoCheckin.trim().toUpperCase())
      setResultado({ tom: 'sucesso', texto: `Presença de ${r.nome} confirmada às ${hora(r.checkinEm)}.` })
      reset()
      void queryClient.invalidateQueries({ queryKey: ['inscritos', eventoId] })
    } catch (e) {
      const erro = mapearErro(e)
      setResultado({ tom: 'erro', texto: (erro.codigo && MENSAGENS_CHECKIN[erro.codigo]) || erro.mensagem })
    }
  })

  return (
    <section className="cartao" aria-label="Check-in">
      <h2 className="cartao__titulo">Check-in</h2>
      <p className="cartao__meta">Digite o código apresentado pelo participante. O check-in é permitido de 2 horas antes do início até o fim do evento.</p>
      <form className="formulario espaco-topo" onSubmit={enviar} noValidate>
        {resultado && (
          <p className={`alerta alerta--${resultado.tom}`} role={resultado.tom === 'erro' ? 'alert' : 'status'}>
            {resultado.texto}
          </p>
        )}
        <Campo rotulo="Código de check-in" erro={errors.codigoCheckin?.message}>
          {(a) => <input className="entrada" placeholder="Digite o código de 12 caracteres" maxLength={12} autoCapitalize="characters" autoComplete="off" style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }} {...a} {...register('codigoCheckin')} />}
        </Campo>
        <button type="submit" className="botao botao--bloco" disabled={isSubmitting}>
          {isSubmitting ? 'Registrando…' : 'Confirmar presença'}
        </button>
      </form>
    </section>
  )
}

function AbaColaboradores({ eventoId, organizador }: { eventoId: string; organizador: boolean }) {
  const queryClient = useQueryClient()
  const [removendo, setRemovendo] = useState<Colaborador | null>(null)
  const [mensagem, setMensagem] = useState<string | null>(null)
  const consulta = useQuery({ queryKey: ['colaboradores', eventoId], queryFn: () => listarColaboradores(eventoId) })
  const { register, handleSubmit, setError, reset, formState: { errors, isSubmitting } } = useForm<ColaboradorForm>({ resolver: zodResolver(colaboradorSchema), defaultValues: { email: '' } })
  const invalidar = () => queryClient.invalidateQueries({ queryKey: ['colaboradores', eventoId] })

  const adicionar = handleSubmit(async ({ email }) => {
    setMensagem(null)
    try {
      await adicionarColaborador(eventoId, email)
      reset()
      await invalidar()
    } catch (e) {
      const erro = mapearErro(e)
      if (erro.codigo === 'USUARIO_NAO_ENCONTRADO') setError('email', { type: 'server', message: 'Não há usuário cadastrado com este e-mail.' })
      else if (erro.codigo === 'JA_COLABORADOR') setError('email', { type: 'server', message: 'Esta pessoa já é colaboradora.' })
      else if (!aplicarErrosDosCampos(erro, setError, ['email'])) setMensagem(erro.mensagem)
    }
  })

  const remover = useMutation({
    mutationFn: (c: Colaborador) => removerColaborador(eventoId, c.usuarioId),
    onSuccess: invalidar,
    onError: (e) => setMensagem(mapearErro(e).mensagem),
    onSettled: () => setRemovendo(null),
  })

  return (
    <section className="cartao" aria-label="Colaboradores">
      <h2 className="cartao__titulo">Colaboradores</h2>
      <p className="cartao__meta">Colaboradores veem os inscritos e fazem o check-in. Só o organizador altera o evento.</p>
      {mensagem && (
        <p className="alerta alerta--erro espaco-topo" role="alert">
          {mensagem}
        </p>
      )}
      {organizador && (
        <form className="linha espaco-topo" style={{ alignItems: 'flex-start' }} onSubmit={adicionar} noValidate>
          <div style={{ flex: '1 1 240px' }}>
            <Campo rotulo="E-mail do colaborador" erro={errors.email?.message}>
              {(a) => <input className="entrada" type="email" placeholder="colaborador@email.com" {...a} {...register('email')} />}
            </Campo>
          </div>
          <button type="submit" className="botao" style={{ marginTop: 25 }} disabled={isSubmitting}>
            {isSubmitting ? 'Adicionando…' : 'Adicionar'}
          </button>
        </form>
      )}
      <div className="espaco-topo">
        {consulta.isPending ? (
          <Carregando linhas={1} />
        ) : consulta.isError ? (
          <Erro erro={mapearErro(consulta.error)} aoTentarNovamente={() => consulta.refetch()} />
        ) : consulta.data.length === 0 ? (
          <p className="texto-suave">Nenhum colaborador ainda.</p>
        ) : (
          <ul className="lista-simples">
            {consulta.data.map((c) => (
              <li key={c.usuarioId} className="linha linha--entre">
                <div>
                  <strong>{c.nome}</strong>
                  <p className="texto-suave texto-pequeno">
                    {c.email} · desde {dataNumerica(c.adicionadoEm)}
                  </p>
                </div>
                {organizador && (
                  <button type="button" className="botao botao--perigo botao--pequeno" onClick={() => setRemovendo(c)}>
                    Remover
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      {removendo && (
        <Confirmacao
          titulo="Remover colaborador?"
          mensagem={`${removendo.nome} deixará de ver os inscritos e de fazer check-in neste evento.`}
          rotuloConfirmar="Remover"
          perigo
          carregando={remover.isPending}
          aoConfirmar={() => remover.mutate(removendo)}
          aoFechar={() => setRemovendo(null)}
        />
      )}
    </section>
  )
}

function AbaAlteracoes({ eventoId }: { eventoId: string }) {
  const consulta = useQuery({ queryKey: ['alteracoes', eventoId], queryFn: () => listarAlteracoes(eventoId) })
  return (
    <section className="cartao" aria-label="Alterações">
      <h2 className="cartao__titulo">Histórico de alterações</h2>
      <div className="espaco-topo">
        {consulta.isPending ? (
          <Carregando linhas={1} />
        ) : consulta.isError ? (
          <Erro erro={mapearErro(consulta.error)} aoTentarNovamente={() => consulta.refetch()} />
        ) : consulta.data.length === 0 ? (
          <p className="texto-suave">Este evento ainda não foi alterado depois de publicado.</p>
        ) : (
          <ul className="lista-simples">
            {consulta.data.map((a, i) => (
              <li key={`${a.campo}-${a.criadoEm}-${i}`}>
                <strong>{a.campo}</strong>
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
        )}
      </div>
    </section>
  )
}

function CancelarEventoModal({ evento, aoFechar }: { evento: EventoDetalhe; aoFechar: () => void }) {
  const queryClient = useQueryClient()
  const [mensagem, setMensagem] = useState<string | null>(null)
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<CancelamentoForm>({ resolver: zodResolver(cancelamentoSchema), defaultValues: { motivo: '' } })

  const enviar = handleSubmit(async ({ motivo }) => {
    setMensagem(null)
    try {
      await cancelarEvento(evento.id, motivo)
      await queryClient.invalidateQueries()
      aoFechar()
    } catch (e) {
      const erro = mapearErro(e)
      if (!aplicarErrosDosCampos(erro, setError, ['motivo'])) setMensagem(erro.mensagem)
    }
  })

  return (
    <Modal
      titulo="Cancelar evento"
      aoFechar={aoFechar}
      acoes={
        <>
          <button type="button" className="botao botao--contorno" onClick={aoFechar}>
            Voltar
          </button>
          <button type="submit" form="form-cancelar-evento" className="botao botao--perigo" disabled={isSubmitting}>
            {isSubmitting ? 'Cancelando…' : 'Confirmar cancelamento'}
          </button>
        </>
      }
    >
      <p className="texto-suave">
        Todas as inscrições de “{evento.titulo}” serão canceladas, os pagamentos aprovados serão estornados e todos serão avisados. Esta ação não pode ser desfeita.
      </p>
      <form id="form-cancelar-evento" className="formulario espaco-topo" onSubmit={enviar} noValidate>
        {mensagem && (
          <p className="alerta alerta--erro" role="alert">
            {mensagem}
          </p>
        )}
        <Campo rotulo="Motivo do cancelamento" erro={errors.motivo?.message} ajuda="De 10 a 300 caracteres. Será enviado aos inscritos.">
          {(a) => <textarea className="entrada" maxLength={300} style={{ minHeight: 90 }} {...a} {...register('motivo')} />}
        </Campo>
      </form>
    </Modal>
  )
}

export function GestaoEventoPage() {
  const { id = '' } = useParams()
  const local = useLocation()
  const queryClient = useQueryClient()
  const [aba, setAba] = useState<Aba>('inscritos')
  const [cancelando, setCancelando] = useState(false)
  const [mensagem, setMensagem] = useState<string | null>(null)
  const consulta = useQuery({ queryKey: ['evento', id], queryFn: () => obterEvento(id), retry: false })
  const evento = consulta.data?.evento
  useTitulo(evento ? `Gestão: ${evento.titulo}` : 'Gestão do evento')

  const publicar = useMutation({
    mutationFn: () => publicarEvento(id),
    onSuccess: () => queryClient.invalidateQueries(),
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
    return (
      <main className="pagina pagina--media" id="conteudo">
        <Erro erro={mapearErro(consulta.error)} aoTentarNovamente={() => consulta.refetch()} />
      </main>
    )
  }

  if (!evento.souOrganizador && !evento.souColaborador) {
    return (
      <main className="pagina pagina--media" id="conteudo">
        <div className="estado">
          <strong>Sem acesso à gestão</strong>
          <p>Somente o organizador e os colaboradores podem gerenciar este evento.</p>
          <Link to={`/eventos/${id}`} className="botao botao--secundario">
            Ver página do evento
          </Link>
        </div>
      </main>
    )
  }

  const organizador = evento.souOrganizador
  const inscritos = evento.capacidade !== null && evento.vagasRestantes !== null ? evento.capacidade - evento.vagasRestantes : null
  const abas: [Aba, string][] = [
    ['inscritos', 'Inscritos'],
    ['checkin', 'Check-in'],
    ['colaboradores', 'Colaboradores'],
    ['alteracoes', 'Alterações'],
  ]
  const encerrado = evento.status === 'CANCELADO' || evento.status === 'ENCERRADO'

  return (
    <main className="pagina pagina--media" id="conteudo">
      <h1 className="pagina__titulo">Gestão do evento</h1>
      <div className="linha espaco-topo">
        <SeloStatusEvento status={evento.status} />
        <Selo tom="neutro">{organizador ? 'Você é organizador' : 'Você é colaborador'}</Selo>
      </div>

      {(local.state as { publicado?: boolean } | null)?.publicado && !mensagem && (
        <p className="alerta alerta--sucesso espaco-topo" role="status">
          Evento publicado! Ele já aparece no mural.
        </p>
      )}
      {mensagem && (
        <p className="alerta alerta--erro espaco-topo" role="alert">
          {mensagem}
        </p>
      )}

      <section className="cartao cartao--destaque espaco-topo">
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>{evento.titulo}</h2>
        <p className="cartao__meta">
          {inscritos !== null ? `${inscritos} inscritos • ` : ''}
          {evento.capacidade !== null ? `${evento.capacidade} vagas` : 'Vagas ilimitadas'} • {dataNumerica(evento.dataInicio)}
        </p>
        {organizador && !encerrado && (
          <div className="linha espaco-topo">
            <Link to={`/meus-eventos/${id}/editar`} className="botao botao--secundario botao--pequeno">
              Gerenciar programação
            </Link>
            {(evento.status === 'RASCUNHO' || evento.status === 'OCULTO') && (
              <button type="button" className="botao botao--pequeno" onClick={() => publicar.mutate()} disabled={publicar.isPending}>
                {publicar.isPending ? 'Publicando…' : evento.status === 'OCULTO' ? 'Republicar' : 'Publicar'}
              </button>
            )}
            {evento.status === 'PUBLICADO' && (
              <Link to={`/eventos/${id}`} className="botao botao--contorno botao--pequeno">
                Ver página pública
              </Link>
            )}
          </div>
        )}
      </section>

      <div className="abas espaco-topo" role="tablist" aria-label="Gestão do evento">
        {abas.map(([valor, rotulo]) => (
          <button key={valor} type="button" role="tab" className="aba" aria-selected={aba === valor} onClick={() => setAba(valor)}>
            {rotulo}
          </button>
        ))}
      </div>

      <div className="espaco-topo" role="tabpanel">
        {aba === 'inscritos' && <AbaInscritos eventoId={id} />}
        {aba === 'checkin' && <AbaCheckin eventoId={id} />}
        {aba === 'colaboradores' && <AbaColaboradores eventoId={id} organizador={organizador} />}
        {aba === 'alteracoes' && <AbaAlteracoes eventoId={id} />}
      </div>

      {organizador && !encerrado && (
        <section className="cartao espaco-topo" style={{ borderColor: '#f3c9c5' }}>
          <h2 className="cartao__titulo">Cancelar evento</h2>
          <p className="cartao__meta">Cancela todas as inscrições, solicita estornos e avisa os participantes.</p>
          <button type="button" className="botao botao--perigo botao--pequeno espaco-topo" onClick={() => setCancelando(true)}>
            Cancelar evento
          </button>
        </section>
      )}

      {cancelando && <CancelarEventoModal evento={evento} aoFechar={() => setCancelando(false)} />}
    </main>
  )
}
