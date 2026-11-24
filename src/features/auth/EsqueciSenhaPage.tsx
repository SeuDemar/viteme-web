import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, Navigate } from 'react-router-dom'
import { esqueciSenha } from '../../api/auth'
import { Campo } from '../../components/Campo'
import { mapearErro } from '../../lib/erros'
import { useTitulo } from '../../lib/formulario'
import { esqueciSenhaSchema, type EsqueciSenhaForm } from '../../schemas/auth'
import { useSessao } from './sessao'

/** E43: pede o link de redefinição. A resposta é a mesma exista ou não a conta, então a tela nunca confirma o cadastro. */
export function EsqueciSenhaPage() {
  useTitulo('Esqueci minha senha', { indexar: false })
  const { estado } = useSessao()
  const [enviadoPara, setEnviadoPara] = useState<string | null>(null)
  const [mensagem, setMensagem] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EsqueciSenhaForm>({ resolver: zodResolver(esqueciSenhaSchema), defaultValues: { email: '' } })

  if (estado === 'autenticado') return <Navigate to="/perfil" replace />

  const enviar = handleSubmit(async ({ email }) => {
    setMensagem(null)
    try {
      await esqueciSenha(email)
      setEnviadoPara(email)
    } catch (e) {
      setMensagem(mapearErro(e).mensagem)
    }
  })

  if (enviadoPara) {
    return (
      <main className="pagina pagina--estreita" id="conteudo">
        <h1 className="pagina__titulo">Confira seu e-mail</h1>
        <div className="cartao espaco-topo" role="status">
          <p>
            Se existe uma conta com <strong>{enviadoPara}</strong>, enviamos um link para escolher uma nova senha. O link vale por 1 hora e só pode ser
            usado uma vez.
          </p>
          <p className="texto-suave texto-pequeno">Não chegou? Veja a caixa de spam ou tente de novo em alguns minutos.</p>
          <p className="texto-pequeno">
            <Link to="/entrar">Voltar para entrar</Link>
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="pagina pagina--estreita" id="conteudo">
      <h1 className="pagina__titulo">Esqueci minha senha</h1>
      <p className="pagina__sub">Informe o e-mail da sua conta e enviaremos um link para criar uma nova senha.</p>

      <form className="formulario cartao espaco-topo" onSubmit={enviar} noValidate>
        {mensagem && (
          <p className="alerta alerta--erro" role="alert">
            {mensagem}
          </p>
        )}
        <Campo rotulo="E-mail" erro={errors.email?.message}>
          {(a) => <input className="entrada" type="email" autoComplete="email" placeholder="seu@email.com" {...a} {...register('email')} />}
        </Campo>
        <button type="submit" className="botao botao--bloco" disabled={isSubmitting}>
          {isSubmitting ? 'Enviando…' : 'Enviar link'}
        </button>
        <p className="texto-suave texto-pequeno">
          Lembrou a senha? <Link to="/entrar">Entrar</Link>
        </p>
      </form>
    </main>
  )
}
