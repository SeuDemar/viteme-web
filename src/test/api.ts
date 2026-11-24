import { http, HttpResponse, type HttpHandler } from 'msw'
import type { EventoDetalhe, EventoResumo, MinhaInscricao, Perfil } from '../api/tipos'

/** Todas as rotas da API de teste ficam sob /api/v1 (VITE_API_URL nos testes). */
export const rota = (caminho: string) => `*/api/v1${caminho}`

export const problema = (status: number, codigo: string, detail: string, extras: Record<string, unknown> = {}) =>
  HttpResponse.json({ type: `https://viteme.app/erros/${codigo.toLowerCase()}`, title: detail, status, detail, codigo, traceId: 'trace-teste', ...extras }, { status, headers: { 'Content-Type': 'application/problem+json' } })

export const perfilExemplo: Perfil = {
  id: 'u-1',
  nome: 'Maria Oliveira',
  email: 'maria@exemplo.com',
  telefone: '+5544999999999',
  telefoneVerificado: true,
  aceitaSms: false,
  aceiteSmsEm: null,
  cnpj: '11222333000181',
  razaoSocial: 'Centro Acadêmico de Tecnologia',
  cnpjVerificadoEm: '2026-10-28T12:00:00Z',
  podeOrganizar: true,
}

/** Perfil de quem ainda não cadastrou CNPJ: participa e colabora, mas não cria eventos (RN24). */
export const perfilSemCnpj: Perfil = { ...perfilExemplo, cnpj: null, razaoSocial: null, cnpjVerificadoEm: null, podeOrganizar: false }

export const eventoResumo = (parcial: Partial<EventoResumo> = {}): EventoResumo => ({
  id: 'e-1',
  titulo: 'Semana Acadêmica de Tecnologia',
  categoria: 'Palestra',
  local: 'Auditório principal',
  dataInicio: '2026-11-12T22:00:00Z',
  preco: 0,
  vagasRestantes: 24,
  imagemUrl: null,
  alteradoRecentemente: false,
  ...parcial,
})

export const eventoDetalhe = (parcial: Partial<EventoDetalhe> = {}): EventoDetalhe => ({
  id: 'e-1',
  titulo: 'Semana Acadêmica de Tecnologia',
  descricao: 'Encontro com palestras e oficinas voltadas ao desenvolvimento acadêmico e profissional.',
  categoria: 'Palestra',
  local: 'Auditório principal',
  imagemUrl: null,
  dataInicio: '2026-11-12T22:00:00Z',
  dataFim: '2026-11-13T01:00:00Z',
  inscricaoInicio: '2020-01-01T00:00:00Z',
  inscricaoFim: '2099-01-01T00:00:00Z',
  capacidade: 120,
  preco: 0,
  cargaHoraria: 3,
  status: 'PUBLICADO',
  reabertoEm: null,
  vagasRestantes: 24,
  organizador: { id: 'u-9', nome: 'Centro Acadêmico' },
  atividades: [],
  ultimasAlteracoes: [],
  minhaInscricao: null,
  souOrganizador: false,
  souColaborador: false,
  interessado: false,
  ...parcial,
})

export const inscricaoExemplo = (parcial: Partial<MinhaInscricao> = {}): MinhaInscricao => ({
  id: 'i-1',
  evento: { id: 'e-1', titulo: 'Semana Acadêmica de Tecnologia', dataInicio: '2099-11-12T22:00:00Z', local: 'Auditório principal' },
  status: 'CONFIRMADA',
  codigoCheckin: 'VT2026AB1201',
  reservadaAte: null,
  presencaConfirmada: false,
  certificadoDisponivel: false,
  ...parcial,
})

/** Sessão restaurável: E03 devolve o token e E05 o perfil. `chamadas.renovar` conta as renovações. */
export function sessaoRestauravel(tokens: string[] = ['tok-1', 'tok-2', 'tok-3']) {
  const chamadas = { renovar: 0, cabecalhos: [] as (string | null)[] }
  const handlers: HttpHandler[] = [
    http.post(rota('/auth/renovar'), ({ request }) => {
      chamadas.cabecalhos.push(request.headers.get('x-requested-with'))
      const token = tokens[Math.min(chamadas.renovar, tokens.length - 1)]
      chamadas.renovar += 1
      return HttpResponse.json({ tokenAcesso: token, expiraEm: '2099-01-01T00:00:00Z' })
    }),
    http.get(rota('/usuarios/me'), () => HttpResponse.json(perfilExemplo)),
    http.get(rota('/notificacoes'), () => HttpResponse.json({ itens: [], naoLidas: 0, pagina: 1, total: 0 })),
  ]
  return { chamadas, handlers }
}

/** Visitante: E03 responde 401 (sem cookie de refresh). */
export const visitante = (): HttpHandler => http.post(rota('/auth/renovar'), () => problema(401, 'TOKEN_INVALIDO', 'Token inválido.'))
