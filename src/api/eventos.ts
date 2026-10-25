import { http } from './cliente'
import type {
  Alteracao,
  AtividadeEntrada,
  Atividade,
  Colaborador,
  EventoAtualizacao,
  EventoDetalhe,
  EventoDetalheComVersao,
  EventoEntrada,
  EventoMeu,
  EventoResumo,
  FiltroMural,
  Pagina,
  PapelEvento,
  StatusEvento,
} from './tipos'

export const listarEventos = (filtro: FiltroMural) =>
  http
    .get<Pagina<EventoResumo>>('/eventos', {
      params: {
        busca: filtro.busca || undefined,
        categoria: filtro.categoria || undefined,
        gratuito: filtro.gratuito ? true : undefined,
        dataDe: filtro.dataDe || undefined,
        dataAte: filtro.dataAte || undefined,
        pagina: filtro.pagina ?? 1,
        tamanhoPagina: filtro.tamanhoPagina ?? 12,
      },
    })
    .then((r) => r.data)

export const obterEvento = (id: string): Promise<EventoDetalheComVersao> =>
  http.get<EventoDetalhe>(`/eventos/${id}`).then((r) => ({ evento: r.data, versao: (r.headers['etag'] as string | undefined) ?? null }))

export const listarMeusEventos = (papel?: Exclude<PapelEvento, 'PARTICIPANTE'>, status?: StatusEvento) =>
  http
    .get<EventoMeu[]>('/eventos/meus', { params: { papel: papel?.toLowerCase(), status } })
    .then((r) => r.data)

export const listarAlteracoes = (id: string) => http.get<Alteracao[]>(`/eventos/${id}/alteracoes`).then((r) => r.data)

export const criarEvento = (entrada: EventoEntrada) =>
  http.post<EventoDetalhe>('/eventos', entrada).then((r) => ({ evento: r.data, versao: (r.headers['etag'] as string | undefined) ?? null }))

export const atualizarEvento = (id: string, entrada: EventoAtualizacao, versao: string | null): Promise<EventoDetalheComVersao> =>
  http
    .put<EventoDetalhe>(`/eventos/${id}`, entrada, { headers: versao ? { 'If-Match': versao } : {} })
    .then((r) => ({ evento: r.data, versao: (r.headers['etag'] as string | undefined) ?? null }))

export const publicarEvento = (id: string) => http.post<{ status: StatusEvento }>(`/eventos/${id}/publicar`).then((r) => r.data)

export const cancelarEvento = (id: string, motivo: string) =>
  http.post<{ status: StatusEvento }>(`/eventos/${id}/cancelar`, { motivo }).then((r) => r.data)

export const criarAtividade = (id: string, entrada: AtividadeEntrada) =>
  http.post<Atividade>(`/eventos/${id}/atividades`, entrada).then((r) => r.data)

export const atualizarAtividade = (id: string, atividadeId: string, entrada: AtividadeEntrada) =>
  http.put<Atividade>(`/eventos/${id}/atividades/${atividadeId}`, entrada).then((r) => r.data)

export const removerAtividade = (id: string, atividadeId: string, motivo?: string) =>
  http.delete(`/eventos/${id}/atividades/${atividadeId}`, { params: { motivo } }).then(() => undefined)

export const listarColaboradores = (id: string) => http.get<Colaborador[]>(`/eventos/${id}/colaboradores`).then((r) => r.data)

export const adicionarColaborador = (id: string, email: string) =>
  http.post<Colaborador>(`/eventos/${id}/colaboradores`, { email }).then((r) => r.data)

export const removerColaborador = (id: string, usuarioId: string) =>
  http.delete(`/eventos/${id}/colaboradores/${usuarioId}`).then(() => undefined)

export const acompanharEvento = (id: string) => http.post(`/eventos/${id}/interesse`).then(() => undefined)
export const deixarDeAcompanhar = (id: string) => http.delete(`/eventos/${id}/interesse`).then(() => undefined)

export const denunciarEvento = (id: string, motivo: string, descricao?: string) =>
  http.post(`/eventos/${id}/denuncias`, { motivo, descricao: descricao || undefined }).then(() => undefined)
