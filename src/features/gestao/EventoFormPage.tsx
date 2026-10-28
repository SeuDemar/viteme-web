import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { obterPerfil } from '../../api/auth'
import { atualizarAtividade, atualizarEvento, criarAtividade, criarEvento, obterEvento, publicarEvento, removerAtividade } from '../../api/eventos'
import type { Atividade, EventoDetalhe } from '../../api/tipos'
import { Campo } from '../../components/Campo'
import { Carregando, Erro } from '../../components/Estados'
import { Confirmacao } from '../../components/Modal'
import { SeloStatusEvento } from '../../components/Selo'
import { CATEGORIAS } from '../../lib/categorias'
import { dataEHora, doCampoDataHora, paraCampoDataHora } from '../../lib/formatar'
import { mapearErro } from '../../lib/erros'
import { aplicarErrosDosCampos, useTitulo } from '../../lib/formulario'
import { atividadeSchema, eventoSchema, motivoSchema, paraNumeroPreco, type AtividadeForm, type EventoForm } from '../../schemas/evento'

const CAMPOS_EVENTO = ['titulo', 'descricao', 'categoria', 'local', 'imagemUrl', 'dataInicio', 'dataFim', 'inscricaoInicio', 'inscricaoFim', 'capacidade', 'preco', 'cargaHoraria', 'motivoAlteracao'] as const
const CAMPOS_ATIVIDADE = ['titulo', 'palestrante', 'local', 'inicio', 'fim', 'motivoAlteracao'] as const

function valoresIniciais(e?: EventoDetalhe): EventoForm {
  return {
    titulo: e?.titulo ?? '',
    descricao: e?.descricao ?? '',
    categoria: e?.categoria ?? '',
    local: e?.local ?? '',
    imagemUrl: e?.imagemUrl ?? '',
    dataInicio: paraCampoDataHora(e?.dataInicio),
    dataFim: paraCampoDataHora(e?.dataFim),
    inscricaoInicio: paraCampoDataHora(e?.inscricaoInicio),
    inscricaoFim: paraCampoDataHora(e?.inscricaoFim),
    capacidade: e?.capacidade ? String(e.capacidade) : '',
    preco: e ? String(e.preco).replace('.', ',') : '',
    cargaHoraria: e?.cargaHoraria ? String(e.cargaHoraria) : '',
    motivoAlteracao: '',
  }
}

/** Campos que, em evento publicado, exigem motivo da alteração (RN13). */
const CAMPOS_COM_MOTIVO: (keyof EventoForm)[] = ['titulo', 'dataInicio', 'dataFim', 'local']

function AtividadesEditor({ evento, publicado, aoMudar }: { evento: EventoDetalhe; publicado: boolean; aoMudar: () => void }) {
  const [editando, setEditando] = useState<Atividade | 'nova' | null>(null)
  const [removendo, setRemovendo] = useState<Atividade | null>(null)
  const [motivoRemocao, setMotivoRemocao] = useState('')
  const [erroRemocao, setErroRemocao] = useState<string | null>(null)
  const [mensagem, setMensagem] = useState<string | null>(null)
  const atividades = [...evento.atividades].sort((a, b) => a.inicio.localeCompare(b.inicio))

  const { register, handleSubmit, setError, reset, formState: { errors, isSubmitting } } = useForm<AtividadeForm>({
    resolver: zodResolver(atividadeSchema),
    defaultValues: { titulo: '', palestrante: '', local: '', inicio: '', fim: '', motivoAlteracao: '' },
  })

  const abrir = (a: Atividade | 'nova') => {
    setMensagem(null)
    setEditando(a)
    reset(
      a === 'nova'
        ? { titulo: '', palestrante: '', local: '', inicio: paraCampoDataHora(evento.dataInicio), fim: paraCampoDataHora(evento.dataInicio), motivoAlteracao: '' }
        : { titulo: a.titulo, palestrante: a.palestrante ?? '', local: a.local ?? '', inicio: paraCampoDataHora(a.inicio), fim: paraCampoDataHora(a.fim), motivoAlteracao: '' },
    )
  }

  const salvar = handleSubmit(async (dados) => {
    setMensagem(null)
    if (publicado && !motivoSchema.safeParse(dados.motivoAlteracao).success) {
      setError('motivoAlteracao', { type: 'manual', message: 'Informe o motivo da alteração (10 a 300 caracteres).' })
      return
    }
    const entrada = {
      titulo: dados.titulo,
      palestrante: dados.palestrante || null,
      local: dados.local || null,
      inicio: doCampoDataHora(dados.inicio),
      fim: doCampoDataHora(dados.fim),
      motivoAlteracao: publicado ? dados.motivoAlteracao : undefined,
    }
    try {
      if (editando === 'nova') await criarAtividade(evento.id, entrada)
      else if (editando) await atualizarAtividade(evento.id, editando.id, entrada)
      setEditando(null)
      aoMudar()
    } catch (e) {
      const erro = mapearErro(e)
      if (!aplicarErrosDosCampos(erro, setError, CAMPOS_ATIVIDADE)) setMensagem(erro.mensagem)
    }
  })

  const remover = useMutation({
    mutationFn: (a: Atividade) => removerAtividade(evento.id, a.id, publicado ? motivoRemocao : undefined),
    onSuccess: () => {
      setRemovendo(null)
      setMotivoRemocao('')
      aoMudar()
    },
    onError: (e) => setErroRemocao(mapearErro(e).mensagem),
  })

  return (
    <section className="cartao" aria-label="Programação">
      <div className="linha linha--entre">
        <h2 className="cartao__titulo">Programação</h2>
        {!editando && (
          <button type="button" className="botao botao--secundario botao--pequeno" onClick={() => abrir('nova')}>
            + Adicionar atividade
          </button>
        )}
      </div>

      {atividades.length === 0 && !editando && <p className="cartao__meta">Nenhuma atividade cadastrada.</p>}
      {atividades.length > 0 && (
        <ul className="lista-simples">
          {atividades.map((a) => (
            <li key={a.id} className="linha linha--entre">
              <div>
                <strong>{a.titulo}</strong>
                <p className="texto-suave texto-pequeno">
                  {dataEHora(a.inicio)} — {dataEHora(a.fim)}
                  {(a.palestrante || a.local) && ` · ${[a.palestrante, a.local].filter(Boolean).join(' · ')}`}
                </p>
              </div>
              <div className="linha">
                <button type="button" className="botao botao--contorno botao--pequeno" onClick={() => abrir(a)}>
                  Editar
                </button>
                <button
                  type="button"
                  className="botao botao--perigo botao--pequeno"
                  onClick={() => {
                    setErroRemocao(null)
                    setRemovendo(a)
                  }}
                >
                  Remover
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editando && (
        <form className="formulario espaco-topo" onSubmit={salvar} noValidate aria-label={editando === 'nova' ? 'Nova atividade' : 'Editar atividade'}>
          {mensagem && (
            <p className="alerta alerta--erro" role="alert">
              {mensagem}
            </p>
          )}
          <div className="formulario__grade">
            <Campo rotulo="Título da atividade" erro={errors.titulo?.message} cheio>
              {(a) => <input className="entrada" {...a} {...register('titulo')} />}
            </Campo>
            <Campo rotulo="Palestrante (opcional)" erro={errors.palestrante?.message}>
              {(a) => <input className="entrada" {...a} {...register('palestrante')} />}
            </Campo>
            <Campo rotulo="Local (opcional)" erro={errors.local?.message}>
              {(a) => <input className="entrada" {...a} {...register('local')} />}
            </Campo>
            <Campo rotulo="Início" erro={errors.inicio?.message}>
              {(a) => <input className="entrada" type="datetime-local" {...a} {...register('inicio')} />}
            </Campo>
            <Campo rotulo="Término" erro={errors.fim?.message}>
              {(a) => <input className="entrada" type="datetime-local" {...a} {...register('fim')} />}
            </Campo>
            {publicado && (
              <Campo rotulo="Motivo da alteração" erro={errors.motivoAlteracao?.message} ajuda="Os inscritos e interessados serão avisados. 10 a 300 caracteres." cheio>
                {(a) => <input className="entrada" maxLength={300} {...a} {...register('motivoAlteracao')} />}
              </Campo>
            )}
          </div>
          <div className="linha">
            <button type="submit" className="botao botao--pequeno" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando…' : 'Salvar atividade'}
            </button>
            <button type="button" className="botao botao--contorno botao--pequeno" onClick={() => setEditando(null)}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {removendo && (
        <Confirmacao
          titulo="Remover atividade?"
          mensagem={
            <>
              “{removendo.titulo}” será removida da programação.
              {publicado && (
                <span className="campo" style={{ marginTop: 12, display: 'flex' }}>
                  <label className="campo__rotulo" htmlFor="motivo-remocao">
                    Motivo (10 a 300 caracteres)
                  </label>
                  <input id="motivo-remocao" className="entrada" value={motivoRemocao} maxLength={300} onChange={(e) => setMotivoRemocao(e.target.value)} />
                </span>
              )}
              {erroRemocao && (
                <span className="campo__erro" role="alert" style={{ display: 'block', marginTop: 8 }}>
                  {erroRemocao}
                </span>
              )}
            </>
          }
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

function Formulario({ inicial, versao, eventoId }: { inicial?: EventoDetalhe; versao: string | null; eventoId?: string }) {
  const navegar = useNavigate()
  const queryClient = useQueryClient()
  // Versão devolvida pelo nosso último salvamento; só vale enquanto a versão carregada pela página não mudar.
  const [salva, setSalva] = useState<{ base: string | null; valor: string | null } | null>(null)
  const versaoAtual = salva && salva.base === versao ? salva.valor : versao
  const [mensagem, setMensagem] = useState<{ tom: 'sucesso' | 'erro'; texto: string } | null>(null)
  const [conflito, setConflito] = useState(false)
  const publicado = inicial?.status === 'PUBLICADO' || inicial?.status === 'OCULTO'
  const finalizado = inicial?.status === 'CANCELADO' || inicial?.status === 'ENCERRADO'

  const { register, handleSubmit, setError, control, reset, formState: { errors, isSubmitting, dirtyFields } } = useForm<EventoForm>({
    resolver: zodResolver(eventoSchema),
    defaultValues: valoresIniciais(inicial),
  })

  const preco = useWatch({ control, name: 'preco' })
  const exigeMotivo = publicado && CAMPOS_COM_MOTIVO.some((c) => dirtyFields[c])

  const invalidar = async () => {
    await queryClient.invalidateQueries({ queryKey: ['evento'] })
    await queryClient.invalidateQueries({ queryKey: ['eventos'] })
    await queryClient.invalidateQueries({ queryKey: ['meus-eventos'] })
  }

  const montarEntrada = (d: EventoForm) => ({
    titulo: d.titulo,
    descricao: d.descricao,
    categoria: d.categoria,
    local: d.local,
    imagemUrl: d.imagemUrl || null,
    dataInicio: doCampoDataHora(d.dataInicio),
    dataFim: doCampoDataHora(d.dataFim),
    inscricaoInicio: doCampoDataHora(d.inscricaoInicio),
    inscricaoFim: doCampoDataHora(d.inscricaoFim),
    capacidade: d.capacidade.trim() ? Number(d.capacidade) : null,
    preco: paraNumeroPreco(d.preco),
    cargaHoraria: d.cargaHoraria.trim() ? Number(d.cargaHoraria) : null,
  })

  const tratarErro = (e: unknown) => {
    const erro = mapearErro(e)
    if (erro.status === 412) {
      setConflito(true)
      return
    }
    if (erro.codigo === 'MOTIVO_OBRIGATORIO') setError('motivoAlteracao', { type: 'server', message: 'Informe o motivo da alteração (10 a 300 caracteres).' })
    else if (erro.codigo === 'PRECO_BLOQUEADO') setError('preco', { type: 'server', message: erro.mensagem })
    else if (erro.codigo === 'CAPACIDADE_ABAIXO_DAS_VAGAS_OCUPADAS') setError('capacidade', { type: 'server', message: erro.mensagem })
    else if (!aplicarErrosDosCampos(erro, setError, CAMPOS_EVENTO)) setMensagem({ tom: 'erro', texto: erro.mensagem })
  }

  const salvar = handleSubmit(async (dados) => {
    setMensagem(null)
    if (exigeMotivo && !motivoSchema.safeParse(dados.motivoAlteracao).success) {
      setError('motivoAlteracao', { type: 'manual', message: 'Informe o motivo da alteração (10 a 300 caracteres).' })
      return
    }
    try {
      if (!eventoId) {
        const criado = await criarEvento(montarEntrada(dados))
        await invalidar()
        navegar(`/meus-eventos/${criado.evento.id}/editar`, { replace: true, state: { criado: true } })
        return
      }
      const resposta = await atualizarEvento(eventoId, { ...montarEntrada(dados), motivoAlteracao: exigeMotivo ? dados.motivoAlteracao : undefined }, versaoAtual)
      setSalva({ base: versao, valor: resposta.versao })
      await invalidar()
      reset({ ...valoresIniciais(resposta.evento) })
      setMensagem({ tom: 'sucesso', texto: publicado ? 'Alterações salvas. Inscritos e interessados foram avisados.' : 'Rascunho salvo.' })
    } catch (e) {
      tratarErro(e)
    }
  })

  const publicar = useMutation({
    mutationFn: () => publicarEvento(eventoId!),
    onSuccess: async () => {
      await invalidar()
      navegar(`/meus-eventos/${eventoId}`, { state: { publicado: true } })
    },
    onError: (e) => {
      const erro = mapearErro(e)
      setMensagem({ tom: 'erro', texto: erro.mensagem })
    },
  })

  if (finalizado) {
    return (
      <p className="alerta alerta--aviso">
        Este evento está {inicial?.status === 'CANCELADO' ? 'cancelado' : 'encerrado'} e não pode mais ser editado. <Link to={`/meus-eventos/${eventoId}`}>Voltar à gestão</Link>
      </p>
    )
  }

  const comTaxaAviso = paraNumeroPreco(preco || '0') > 0

  return (
    <div className="pilha pilha--grande">
      <form className="formulario cartao" onSubmit={salvar} noValidate>
        {conflito && (
          <p className="alerta alerta--erro" role="alert">
            Este evento foi alterado por outra pessoa. <button type="button" className="botao-link" onClick={() => window.location.reload()}>Recarregar a página</button> para ver a versão mais recente.
          </p>
        )}
        {mensagem && (
          <p className={`alerta alerta--${mensagem.tom}`} role={mensagem.tom === 'erro' ? 'alert' : 'status'}>
            {mensagem.texto}
          </p>
        )}
        <div className="formulario__grade">
          <Campo rotulo="Título do evento" erro={errors.titulo?.message} cheio>
            {(a) => <input className="entrada" placeholder="Ex.: Semana Acadêmica" maxLength={150} {...a} {...register('titulo')} />}
          </Campo>
          <Campo rotulo="Descrição" erro={errors.descricao?.message} ajuda="Texto simples, sem formatação." cheio>
            {(a) => <textarea className="entrada" placeholder="Descreva o objetivo do evento" maxLength={5000} {...a} {...register('descricao')} />}
          </Campo>
          <Campo rotulo="Categoria" erro={errors.categoria?.message}>
            {(a) => (
              <select className="entrada" {...a} {...register('categoria')}>
                <option value="">Selecione uma categoria</option>
                {CATEGORIAS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
                {inicial && !(CATEGORIAS as readonly string[]).includes(inicial.categoria) && <option value={inicial.categoria}>{inicial.categoria}</option>}
              </select>
            )}
          </Campo>
          <Campo rotulo="Local" erro={errors.local?.message}>
            {(a) => <input className="entrada" placeholder="Local ou link" maxLength={200} {...a} {...register('local')} />}
          </Campo>
          <Campo rotulo="Início do evento" erro={errors.dataInicio?.message}>
            {(a) => <input className="entrada" type="datetime-local" {...a} {...register('dataInicio')} />}
          </Campo>
          <Campo rotulo="Término do evento" erro={errors.dataFim?.message}>
            {(a) => <input className="entrada" type="datetime-local" {...a} {...register('dataFim')} />}
          </Campo>
          <Campo rotulo="Inscrições abrem em" erro={errors.inscricaoInicio?.message}>
            {(a) => <input className="entrada" type="datetime-local" {...a} {...register('inscricaoInicio')} />}
          </Campo>
          <Campo rotulo="Inscrições encerram em" erro={errors.inscricaoFim?.message} ajuda="Até o início do evento.">
            {(a) => <input className="entrada" type="datetime-local" {...a} {...register('inscricaoFim')} />}
          </Campo>
          <Campo rotulo="Preço" erro={errors.preco?.message} ajuda={comTaxaAviso ? 'Atenção: o gateway de pagamento pode cobrar uma taxa de processamento do organizador. O Viteme não cobra taxa.' : 'Use 0 para evento gratuito.'}>
            {(a) => <input className="entrada" inputMode="decimal" placeholder="R$ 0,00" {...a} {...register('preco')} />}
          </Campo>
          <Campo rotulo="Capacidade (opcional)" erro={errors.capacidade?.message} ajuda="Deixe em branco para vagas ilimitadas.">
            {(a) => <input className="entrada" inputMode="numeric" placeholder="Quantidade de vagas" {...a} {...register('capacidade')} />}
          </Campo>
          <Campo rotulo="Carga horária em horas (opcional)" erro={errors.cargaHoraria?.message} ajuda="Necessária para emitir certificados.">
            {(a) => <input className="entrada" inputMode="numeric" placeholder="Ex.: 3" {...a} {...register('cargaHoraria')} />}
          </Campo>
          <Campo rotulo="Imagem (opcional)" erro={errors.imagemUrl?.message} ajuda="Endereço https de uma imagem.">
            {(a) => <input className="entrada" type="url" placeholder="https://…" {...a} {...register('imagemUrl')} />}
          </Campo>
          {exigeMotivo && (
            <Campo rotulo="Motivo da alteração" erro={errors.motivoAlteracao?.message} ajuda="Inscritos e interessados serão avisados. 10 a 300 caracteres." cheio>
              {(a) => <input className="entrada" maxLength={300} {...a} {...register('motivoAlteracao')} />}
            </Campo>
          )}
        </div>
        <div className="linha">
          <button type="submit" className="botao" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando…' : eventoId ? (publicado ? 'Salvar alterações' : 'Salvar rascunho') : 'Salvar rascunho'}
          </button>
          {eventoId && inicial?.status !== 'PUBLICADO' && (
            <button
              type="button"
              className="botao botao--secundario"
              disabled={publicar.isPending}
              onClick={() => {
                const alterado = Object.keys(dirtyFields).length > 0
                if (alterado) {
                  setMensagem({ tom: 'erro', texto: 'Salve o rascunho antes de publicar.' })
                  return
                }
                publicar.mutate()
              }}
            >
              {publicar.isPending ? 'Publicando…' : inicial?.status === 'OCULTO' ? 'Republicar evento' : 'Publicar evento'}
            </button>
          )}
          <Link to={eventoId ? `/meus-eventos/${eventoId}` : '/meus-eventos'} className="botao botao--contorno">
            {eventoId ? 'Voltar à gestão' : 'Cancelar'}
          </Link>
        </div>
      </form>

      {eventoId && inicial && <AtividadesEditor evento={inicial} publicado={Boolean(publicado)} aoMudar={() => void queryClient.invalidateQueries({ queryKey: ['evento', eventoId] })} />}
    </div>
  )
}

/** RN24: sem CNPJ verificado a API recusa a criação (403); avisamos antes de a pessoa preencher o formulário. */
function NovoEvento() {
  const perfil = useQuery({ queryKey: ['perfil'], queryFn: obterPerfil })

  if (perfil.isPending) return <Carregando />
  if (perfil.isError) return <Erro erro={mapearErro(perfil.error)} aoTentarNovamente={() => perfil.refetch()} />
  if (!perfil.data.podeOrganizar) {
    return (
      <section className="cartao" aria-label="CNPJ necessário">
        <h2 className="cartao__titulo">Cadastre um CNPJ para criar eventos</h2>
        <p className="cartao__meta">
          Só organizações com CNPJ ativo (centro acadêmico, atlética, empresa ou MEI) criam eventos no Viteme. O CNPJ é verificado uma única vez, no seu perfil.
        </p>
        <Link to="/perfil#cnpj" className="botao espaco-topo">
          Cadastrar CNPJ
        </Link>
      </section>
    )
  }
  return <Formulario key="novo" versao={null} />
}

export function EventoFormPage() {
  const { id } = useParams()
  useTitulo(id ? 'Editar evento' : 'Criar evento')
  const consulta = useQuery({ queryKey: ['evento', id], queryFn: () => obterEvento(id!), enabled: Boolean(id), retry: false, staleTime: 0, refetchOnWindowFocus: false })

  return (
    <main className="pagina pagina--media" id="conteudo">
      <div className="linha linha--entre">
        <h1 className="pagina__titulo">{id ? 'Editar evento' : 'Criar evento'}</h1>
        {consulta.data && <SeloStatusEvento status={consulta.data.evento.status} />}
      </div>
      <div className="espaco-topo">
        {!id ? (
          <NovoEvento />
        ) : consulta.isPending ? (
          <Carregando />
        ) : consulta.isError ? (
          <Erro erro={mapearErro(consulta.error)} aoTentarNovamente={() => consulta.refetch()} />
        ) : !consulta.data.evento.souOrganizador ? (
          <p className="alerta alerta--erro" role="alert">
            Somente o organizador pode editar o evento. <Link to={`/meus-eventos/${id}`}>Voltar</Link>
          </p>
        ) : (
          <Formulario key={id} inicial={consulta.data.evento} versao={consulta.data.versao} eventoId={id} />
        )}
      </div>
    </main>
  )
}
