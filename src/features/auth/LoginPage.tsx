import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Campo } from '../../components/Campo'
import { mapearErro } from '../../lib/erros'
import { useTitulo } from '../../lib/formulario'
import { loginSchema, type LoginForm } from '../../schemas/auth'
import { useSessao } from './sessao'

export function LoginPage() {
  useTitulo('Entrar')
  const { estado, login } = useSessao()
  const navegar = useNavigate()
  const local = useLocation()
  const destino = (local.state as { de?: string } | null)?.de ?? '/'
  const [mensagem, setMensagem] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', senha: '' } })

  if (estado === 'autenticado') return <Navigate to={destino} replace />

  const enviar = handleSubmit(async ({ email, senha }) => {
    setMensagem(null)
    try {
      await login(email, senha)
      navegar(destino, { replace: true })
    } catch (e) {
      setMensagem(mapearErro(e).mensagem)
    }
  })

  return (
    <main className="pagina pagina--estreita" id="conteudo">
      <h1 className="pagina__titulo">Entrar na sua conta</h1>
      <p className="pagina__sub">Acesse sua conta para participar dos eventos.</p>

      <form className="formulario cartao espaco-topo" onSubmit={enviar} noValidate>
        {destino !== '/' && <p className="alerta">Entre para continuar de onde você parou.</p>}
        {mensagem && (
          <p className="alerta alerta--erro" role="alert">
            {mensagem}
          </p>
        )}
        <Campo rotulo="E-mail" erro={errors.email?.message}>
          {(a) => <input className="entrada" type="email" autoComplete="email" placeholder="seu@email.com" {...a} {...register('email')} />}
        </Campo>
        <Campo rotulo="Senha" erro={errors.senha?.message}>
          {(a) => <input className="entrada" type="password" autoComplete="current-password" placeholder="Sua senha" {...a} {...register('senha')} />}
        </Campo>
        <button type="submit" className="botao botao--bloco" disabled={isSubmitting}>
          {isSubmitting ? 'Entrando…' : 'Entrar'}
        </button>
        <p className="texto-suave texto-pequeno">
          Ainda não tem conta? <Link to="/cadastro" state={local.state}>Cadastre-se</Link>
        </p>
      </form>
    </main>
  )
}
