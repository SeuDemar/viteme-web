import { isAxiosError } from 'axios'
import { http } from './cliente'
import type {
  CheckinResposta,
  Cobranca,
  Inscrito,
  InscricaoCriada,
  MinhaInscricao,
  Pagina,
  PagamentoStatus,
  SituacaoInscricoes,
  StatusInscricao,
} from './tipos'

export const inscrever = (eventoId: string) =>
  http.post<InscricaoCriada>(`/eventos/${eventoId}/inscricoes`).then((r) => r.data)

export const listarMinhasInscricoes = (situacao: SituacaoInscricoes) =>
  http.get<MinhaInscricao[]>('/inscricoes/minhas', { params: { situacao } }).then((r) => r.data)

export const cancelarInscricao = (id: string) =>
  http.post<{ status: StatusInscricao; estornoSolicitado: boolean }>(`/inscricoes/${id}/cancelar`).then((r) => r.data)

export const listarInscritos = (eventoId: string, params: { status?: string; busca?: string; pagina?: number; tamanhoPagina?: number }) =>
  http
    .get<Pagina<Inscrito>>(`/eventos/${eventoId}/inscricoes`, {
      params: { status: params.status || undefined, busca: params.busca || undefined, pagina: params.pagina ?? 1, tamanhoPagina: params.tamanhoPagina ?? 20 },
    })
    .then((r) => r.data)

export const registrarCheckin = (eventoId: string, codigoCheckin: string) =>
  http.post<CheckinResposta>(`/eventos/${eventoId}/checkin`, { codigoCheckin }).then((r) => r.data)

export const gerarCobranca = (inscricaoId: string) =>
  http.post<Cobranca>(`/inscricoes/${inscricaoId}/pagamento`).then((r) => r.data)

export const consultarPagamento = (inscricaoId: string) =>
  http.get<PagamentoStatus>(`/inscricoes/${inscricaoId}/pagamento`).then((r) => r.data)

/** SOMENTE DEMONSTRAÇÃO (gateway stub): aprova, recusa ou expira a cobrança do usuário. */
export const simularPagamento = (idTransacao: string, resultado: 'aprovar' | 'recusar' | 'expirar') =>
  http.post(`/simulador/pagamentos/${idTransacao}/${resultado}`).then((r) => r.data)

/** Com `responseType: 'blob'` o ProblemDetails de erro também chega como Blob: converte de volta em JSON para `mapearErro`. */
async function erroComCorpoLegivel(erro: unknown): Promise<never> {
  if (isAxiosError(erro) && erro.response?.data instanceof Blob) {
    try {
      erro.response.data = JSON.parse(await erro.response.data.text())
    } catch {
      // Corpo que não é JSON: mapearErro usa a mensagem padrão do status.
    }
  }
  throw erro
}

export async function baixarCertificado(inscricaoId: string, nomeArquivo = 'certificado-viteme.pdf') {
  const { data } = await http.get<Blob>(`/inscricoes/${inscricaoId}/certificado`, { responseType: 'blob' }).catch(erroComCorpoLegivel)
  const url = URL.createObjectURL(data)
  const link = document.createElement('a')
  link.href = url
  link.download = nomeArquivo
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
