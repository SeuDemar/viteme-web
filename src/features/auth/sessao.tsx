import { useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { entrar, obterPerfil, sair as sairDaApi } from '../../api/auth'
import { definirToken, registrarAoSessaoExpirar, renovarSessao } from '../../api/cliente'
import type { UsuarioResumo } from '../../api/tipos'

type EstadoSessao = 'restaurando' | 'autenticado' | 'anonimo'

interface SessaoContexto {
  estado: EstadoSessao
  usuario: UsuarioResumo | null
  login: (email: string, senha: string) => Promise<void>
  logout: () => Promise<void>
  atualizarUsuario: (parcial: Partial<UsuarioResumo>) => void
}

const Contexto = createContext<SessaoContexto | null>(null)

// A restauração (E03) é compartilhada para o StrictMode não renovar duas vezes na inicialização.
let restauracao: Promise<UsuarioResumo | null> | null = null

function restaurarSessao(): Promise<UsuarioResumo | null> {
  restauracao ??= (async () => {
    try {
      await renovarSessao()
      const perfil = await obterPerfil()
      return {
        id: perfil.id,
        nome: perfil.nome,
        email: perfil.email,
        telefoneVerificado: perfil.telefoneVerificado,
        aceitaSms: perfil.aceitaSms,
      }
    } catch {
      definirToken(null)
      return null
    }
  })()
  return restauracao
}

/** Apenas para testes: permite repetir a restauração em cada caso. */
export function reiniciarRestauracaoParaTestes() {
  restauracao = null
}

export function SessaoProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [estado, setEstado] = useState<EstadoSessao>('restaurando')
  const [usuario, setUsuario] = useState<UsuarioResumo | null>(null)

  const encerrarLocalmente = useCallback(() => {
    definirToken(null)
    setUsuario(null)
    setEstado('anonimo')
    queryClient.clear()
  }, [queryClient])

  useEffect(() => {
    let ativo = true
    // Na inicialização o frontend chama E03 e só depois as rotas protegidas decidem (PDF, 5.6 b).
    restaurarSessao().then((restaurado) => {
      if (!ativo) return
      setUsuario(restaurado)
      setEstado(restaurado ? 'autenticado' : 'anonimo')
    })
    registrarAoSessaoExpirar(encerrarLocalmente)
    return () => {
      ativo = false
      registrarAoSessaoExpirar(null)
    }
  }, [encerrarLocalmente])

  const login = useCallback(async (email: string, senha: string) => {
    const resposta = await entrar(email, senha)
    definirToken(resposta.tokenAcesso)
    restauracao = Promise.resolve(resposta.usuario)
    setUsuario(resposta.usuario)
    setEstado('autenticado')
    // Dados lidos como visitante (ex.: detalhe do evento sem a inscrição do usuário) ficam desatualizados.
    void queryClient.invalidateQueries()
  }, [queryClient])

  const logout = useCallback(async () => {
    try {
      await sairDaApi()
    } finally {
      restauracao = Promise.resolve(null)
      encerrarLocalmente()
    }
  }, [encerrarLocalmente])

  const atualizarUsuario = useCallback((parcial: Partial<UsuarioResumo>) => {
    setUsuario((atual) => (atual ? { ...atual, ...parcial } : atual))
  }, [])

  const valor = useMemo(
    () => ({ estado, usuario, login, logout, atualizarUsuario }),
    [estado, usuario, login, logout, atualizarUsuario],
  )

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

export function useSessao(): SessaoContexto {
  const contexto = useContext(Contexto)
  if (!contexto) throw new Error('useSessao deve ser usado dentro de SessaoProvider')
  return contexto
}
