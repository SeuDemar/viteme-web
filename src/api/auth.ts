import { http } from './cliente'
import type { LoginResposta, Perfil } from './tipos'

export interface CadastroEntrada {
  nome: string
  email: string
  senha: string
  telefone?: string
}

export const cadastrar = (entrada: CadastroEntrada) => http.post('/auth/cadastro', entrada).then((r) => r.data)

export const entrar = (email: string, senha: string) =>
  http.post<LoginResposta>('/auth/login', { email, senha }).then((r) => r.data)

export const sair = () => http.post('/auth/logout').then(() => undefined)

export const obterPerfil = () => http.get<Perfil>('/usuarios/me').then((r) => r.data)

export const atualizarPerfil = (nome: string, telefone?: string) =>
  http.put<Perfil>('/usuarios/me', { nome, telefone }).then((r) => r.data)

export const enviarCodigoTelefone = () =>
  http.post<{ expiraEm: string }>('/usuarios/me/telefone/codigo').then((r) => r.data)

export const verificarTelefone = (codigo: string) =>
  http.post<{ telefoneVerificado: boolean }>('/usuarios/me/telefone/verificar', { codigo }).then((r) => r.data)

export const definirAceiteSms = (aceitaSms: boolean) =>
  http.put<{ aceitaSms: boolean; aceiteSmsEm: string | null }>('/usuarios/me/preferencias-sms', { aceitaSms }).then((r) => r.data)
