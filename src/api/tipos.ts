// Tipos do contrato da API (viteme-api, /api/v1). Enums chegam em SNAKE_CASE_UPPER; datas em ISO 8601 UTC.

export type StatusEvento = 'RASCUNHO' | 'PUBLICADO' | 'OCULTO' | 'CANCELADO' | 'ENCERRADO'
export type StatusInscricao = 'PENDENTE_PAGAMENTO' | 'CONFIRMADA' | 'CANCELADA' | 'EXPIRADA'
export type StatusPagamento = 'PENDENTE' | 'APROVADO' | 'RECUSADO' | 'ESTORNADO' | 'EXPIRADO'
export type PapelEvento = 'PARTICIPANTE' | 'COLABORADOR' | 'ORGANIZADOR'
export type TipoNotificacao =
  | 'INSCRICAO'
  | 'PAGAMENTO'
  | 'ALTERACAO'
  | 'LEMBRETE'
  | 'CANCELAMENTO'
  | 'COLABORACAO'
  | 'DENUNCIA'
export type MotivoDenuncia = 'EVENTO_FALSO' | 'GOLPE' | 'CONTEUDO_IMPROPRIO' | 'SPAM' | 'OUTRO'

export interface Pagina<T> {
  itens: T[]
  pagina: number
  tamanhoPagina: number
  total: number
}

export interface UsuarioResumo {
  id: string
  nome: string
  email: string
  telefoneVerificado: boolean
  aceitaSms: boolean
}

export interface LoginResposta {
  tokenAcesso: string
  expiraEm: string
  usuario: UsuarioResumo
}

export interface RenovarResposta {
  tokenAcesso: string
  expiraEm: string
}

export interface Perfil {
  id: string
  nome: string
  email: string
  telefone: string | null
  telefoneVerificado: boolean
  aceitaSms: boolean
  aceiteSmsEm: string | null
  /** CNPJ do organizador, sem máscara (RN24). */
  cnpj: string | null
  razaoSocial: string | null
  cnpjVerificadoEm: string | null
  /** Só quem tem CNPJ verificado cria e publica eventos. */
  podeOrganizar: boolean
}

export interface EventoResumo {
  id: string
  titulo: string
  categoria: string
  local: string
  dataInicio: string
  preco: number
  vagasRestantes: number | null
  imagemUrl: string | null
  alteradoRecentemente: boolean
  /** Dentro do período de inscrições (não considera vagas). Opcional: versões antigas da API não devolvem. */
  inscricoesAbertas?: boolean
}

export interface EventoMeu {
  id: string
  titulo: string
  categoria: string
  local: string
  dataInicio: string
  dataFim: string
  preco: number
  status: StatusEvento
  papel: PapelEvento
  imagemUrl: string | null
  /** `null` = ilimitada. Opcionais: versões antigas da API não devolvem. */
  capacidade?: number | null
  /** Vagas ocupadas: confirmadas + pendentes com reserva válida. */
  inscritos?: number
}

export interface Atividade {
  id: string
  titulo: string
  palestrante: string | null
  local: string | null
  inicio: string
  fim: string
}

export interface Alteracao {
  campo: string
  valorAnterior: string | null
  valorNovo: string | null
  motivo: string
  criadoEm: string
}

export interface MinhaInscricaoResumo {
  id: string
  status: StatusInscricao
  codigoCheckin: string
  reservadaAte: string | null
}

export interface EventoDetalhe {
  id: string
  titulo: string
  descricao: string
  categoria: string
  local: string
  imagemUrl: string | null
  dataInicio: string
  dataFim: string
  inscricaoInicio: string
  inscricaoFim: string
  capacidade: number | null
  preco: number
  cargaHoraria: number | null
  status: StatusEvento
  reabertoEm: string | null
  vagasRestantes: number | null
  organizador: { id: string; nome: string }
  atividades: Atividade[]
  ultimasAlteracoes: Alteracao[]
  minhaInscricao: MinhaInscricaoResumo | null
  souOrganizador: boolean
  souColaborador: boolean
  interessado: boolean
}

/** Detalhe do evento mais a versão (ETag) exigida em `If-Match` na edição (E13). */
export interface EventoDetalheComVersao {
  evento: EventoDetalhe
  versao: string | null
}

export interface EventoEntrada {
  titulo: string
  descricao: string
  categoria: string
  local: string
  imagemUrl?: string | null
  dataInicio: string
  dataFim: string
  inscricaoInicio: string
  inscricaoFim: string
  capacidade?: number | null
  preco: number
  cargaHoraria?: number | null
}

export interface EventoAtualizacao extends EventoEntrada {
  motivoAlteracao?: string
}

export interface AtividadeEntrada {
  titulo: string
  palestrante?: string | null
  local?: string | null
  inicio: string
  fim: string
  motivoAlteracao?: string
}

export interface Colaborador {
  usuarioId: string
  nome: string
  email: string
  adicionadoEm: string
}

export interface InscricaoCriada {
  id: string
  status: StatusInscricao
  codigoCheckin: string | null
  reservadaAte: string | null
  pagamento: { id: string; valor: number; urlPagamento: string | null } | null
}

export interface MinhaInscricao {
  id: string
  evento: { id: string; titulo: string; dataInicio: string; local: string }
  status: StatusInscricao
  codigoCheckin: string
  reservadaAte: string | null
  presencaConfirmada: boolean
  certificadoDisponivel: boolean
}

export type SituacaoInscricoes = 'proximas' | 'passadas' | 'todas'

export interface Inscrito {
  inscricaoId: string
  nome: string
  email: string
  status: StatusInscricao
  presencaConfirmada: boolean
  checkinEm: string | null
}

export interface CheckinResposta {
  nome: string
  checkinEm: string
}

export interface Cobranca {
  pagamentoId: string
  status: StatusPagamento
  valor: number
  urlPagamento: string | null
}

export interface PagamentoStatus {
  status: StatusPagamento
  valor: number
  metodo: string | null
  atualizadoEm: string
  statusInscricao: StatusInscricao
}

export interface Notificacao {
  id: string
  tipo: TipoNotificacao
  titulo: string
  mensagem: string
  eventoId: string | null
  lida: boolean
  criadoEm: string
}

export interface NotificacoesPagina {
  itens: Notificacao[]
  naoLidas: number
  pagina: number
  total: number
}

export interface ValidacaoCertificado {
  valido: boolean
  participante: string
  evento: string
  dataEvento: string
  cargaHoraria: number | null
  emitidoEm: string
}

export interface FiltroMural {
  busca?: string
  categoria?: string
  gratuito?: boolean
  dataDe?: string
  dataAte?: string
  pagina?: number
  tamanhoPagina?: number
}
