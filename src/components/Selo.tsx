import type { StatusEvento, StatusInscricao, StatusPagamento } from '../api/tipos'

type Tom = 'padrao' | 'sucesso' | 'aviso' | 'perigo' | 'neutro'

export function Selo({ tom = 'padrao', children }: { tom?: Tom; children: React.ReactNode }) {
  const classe = tom === 'padrao' ? 'selo' : `selo selo--${tom}`
  return <span className={classe}>{children}</span>
}

const EVENTO: Record<StatusEvento, [string, Tom]> = {
  RASCUNHO: ['RASCUNHO', 'neutro'],
  PUBLICADO: ['PUBLICADO', 'sucesso'],
  OCULTO: ['OCULTO', 'aviso'],
  CANCELADO: ['CANCELADO', 'perigo'],
  ENCERRADO: ['ENCERRADO', 'neutro'],
}

export function SeloStatusEvento({ status }: { status: StatusEvento }) {
  const [texto, tom] = EVENTO[status] ?? [status, 'neutro']
  return <Selo tom={tom}>{texto}</Selo>
}

const INSCRICAO: Record<StatusInscricao, [string, Tom]> = {
  CONFIRMADA: ['CONFIRMADA', 'sucesso'],
  PENDENTE_PAGAMENTO: ['PENDENTE', 'aviso'],
  CANCELADA: ['CANCELADA', 'perigo'],
  EXPIRADA: ['EXPIRADA', 'neutro'],
}

export function SeloStatusInscricao({ status }: { status: StatusInscricao }) {
  const [texto, tom] = INSCRICAO[status] ?? [status, 'neutro']
  return <Selo tom={tom}>{texto}</Selo>
}

const PAGAMENTO: Record<StatusPagamento, [string, Tom]> = {
  PENDENTE: ['Aguardando pagamento', 'aviso'],
  APROVADO: ['Pagamento aprovado', 'sucesso'],
  RECUSADO: ['Pagamento recusado', 'perigo'],
  ESTORNADO: ['Pagamento estornado', 'neutro'],
  EXPIRADO: ['Cobrança expirada', 'neutro'],
}

export function SeloStatusPagamento({ status }: { status: StatusPagamento }) {
  const [texto, tom] = PAGAMENTO[status] ?? [status, 'neutro']
  return <Selo tom={tom}>{texto}</Selo>
}
