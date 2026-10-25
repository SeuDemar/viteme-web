import axios, { type InternalAxiosRequestConfig } from 'axios'
import type { RenovarResposta } from './tipos'

/** URL base da API, com o prefixo /api/v1 (veja .env.example). */
export const URL_API = import.meta.env.VITE_API_URL ?? '/api/v1'

/** Cabeçalho exigido pela API em /auth/renovar e /auth/logout (proteção contra CSRF, decisão D47 da API). */
const CABECALHO_FRONTEND = 'viteme-web'

export const http = axios.create({ baseURL: URL_API, timeout: 20_000 })

// O token de acesso fica somente em memória (nunca em localStorage/sessionStorage).
let tokenAcesso: string | null = null
let aoSessaoExpirar: (() => void) | null = null

export const obterToken = () => tokenAcesso
export const definirToken = (token: string | null) => {
  tokenAcesso = token
}
export const registrarAoSessaoExpirar = (callback: (() => void) | null) => {
  aoSessaoExpirar = callback
}

const ehRotaDeAuth = (url?: string) => /^\/?auth\/(login|renovar|logout|cadastro)/.test(url ?? '')
const usaCookie = (url?: string) => /^\/?auth\/(login|renovar|logout)/.test(url ?? '')

http.interceptors.request.use((config) => {
  if (tokenAcesso) {
    config.headers.Authorization = `Bearer ${tokenAcesso}`
  }
  if (usaCookie(config.url)) {
    config.withCredentials = true
    config.headers['X-Requested-With'] = CABECALHO_FRONTEND
  }
  return config
})

/** Várias abas compartilham o cookie de refresh; o lock evita duas renovações simultâneas com o mesmo token. */
function comLockEntreAbas<T>(trabalho: () => Promise<T>): Promise<T> {
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined
  return locks ? locks.request('viteme-renovar-sessao', trabalho) : trabalho()
}

let renovacaoEmAndamento: Promise<string> | null = null

/** Renova o token de acesso (E03). Chamadas simultâneas compartilham a mesma renovação. */
export function renovarSessao(): Promise<string> {
  renovacaoEmAndamento ??= comLockEntreAbas(async () => {
    const { data } = await http.post<RenovarResposta>('/auth/renovar')
    definirToken(data.tokenAcesso)
    return data.tokenAcesso
  }).finally(() => {
    renovacaoEmAndamento = null
  })
  return renovacaoEmAndamento
}

type ConfigRepetivel = InternalAxiosRequestConfig & { _repetida?: boolean }

http.interceptors.response.use(
  (resposta) => resposta,
  async (erro) => {
    const original = erro.config as ConfigRepetivel | undefined
    const tinhaToken = Boolean(original?.headers?.Authorization)

    if (erro.response?.status === 401 && original && tinhaToken && !original._repetida && !ehRotaDeAuth(original.url)) {
      original._repetida = true
      try {
        const novoToken = await renovarSessao()
        original.headers.Authorization = `Bearer ${novoToken}`
        return http(original)
      } catch {
        definirToken(null)
        aoSessaoExpirar?.()
      }
    }

    throw erro
  },
)
