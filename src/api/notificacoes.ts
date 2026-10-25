import { http } from './cliente'
import type { NotificacoesPagina, ValidacaoCertificado } from './tipos'

export const listarNotificacoes = (params: { lidas?: boolean; pagina?: number; tamanhoPagina?: number } = {}) =>
  http.get<NotificacoesPagina>('/notificacoes', { params: { lidas: params.lidas, pagina: params.pagina ?? 1, tamanhoPagina: params.tamanhoPagina ?? 20 } }).then((r) => r.data)

export const marcarComoLida = (id: string) => http.patch(`/notificacoes/${id}/lida`).then(() => undefined)
export const marcarTodasComoLidas = () => http.patch('/notificacoes/lidas').then(() => undefined)

export const validarCertificado = (codigo: string) =>
  http.get<ValidacaoCertificado>(`/certificados/${encodeURIComponent(codigo)}/validacao`).then((r) => r.data)
