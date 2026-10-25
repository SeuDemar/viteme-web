import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { cadastrar } from '../../api/auth'
import { Campo } from '../../components/Campo'
import { mapearErro } from '../../lib/erros'
import { aplicarErrosDosCampos, useTitulo } from '../../lib/formulario'
import { mascararTelefone, telefoneParaE164 } from '../../lib/formatar'
import { cadastroSchema, type CadastroForm } from '../../schemas/auth'
import { useSessao } from './sessao'

export function CadastroPage() {
  useTitulo('Criar conta')
  const { estado, login } = useSessao()
  const navegar = useNavigate()
  const local = useLocation()
  const destino = (local.state as { de?: string } | null)?.de ?? '/'
  const [mensagem, setMensagem] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CadastroForm>({
    resolver: zodResolver(cadastroSchema),
    defaultValues: { nome: '', email: '', senha: '', confirmarSenha: '', telefone: '' },
  })

  if (estado === 'autenticado') return <Navigate to={destino} replace />

  const enviar = handleSubmit(async (dados) => {
    setMensagem(null)
    try {
      await cadastrar({ nome: dados.nome, email: dados.email, senha: dados.senha, telefone: telefoneParaE164(dados.telefone) })
    } catch (e) {
      const erro = mapearErro(e)
      if (erro.codigo === 'EMAIL_JA_CADASTRADO') {
        setError('email', { type: 'server', message: 'Este e-mail já está cadastrado.' })
      } else if (!aplicarErrosDosCampos(erro, setError, ['nome', 'email', 'senha', 'telefone'])) {
        setMensagem(erro.mensagem)
      }
      return
    }

    try {
      await login(dados.email, dados.senha)
      navegar(destino, { replace: true })
    } catch {
      navegar('/entrar', { replace: true, state: local.state })
    }
  })

  return (
    <main className="pagina pagina--estreita" id="conteudo">
      <h1 className="pagina__titulo">Criar uma conta</h1>
      <p className="pagina__sub">Preencha seus dados e comece a participar.</p>

      <form className="formulario cartao espaco-topo" onSubmit={enviar} noValidate>
        {mensagem && (
          <p className="alerta alerta--erro" role="alert">
            {mensagem}
          </p>
        )}
        <Campo rotulo="Nome completo" erro={errors.nome?.message}>
          {(a) => <input className="entrada" autoComplete="name" placeholder="Seu nome" {...a} {...register('nome')} />}
        </Campo>
        <Campo rotulo="E-mail" erro={errors.email?.message}>
          {(a) => <input className="entrada" type="email" autoComplete="email" placeholder="seu@email.com" {...a} {...register('email')} />}
        </Campo>
        <Campo rotulo="Senha" erro={errors.senha?.message} ajuda="Mínimo de 8 caracteres, com letra e número.">
          {(a) => <input className="entrada" type="password" autoComplete="new-password" placeholder="Crie uma senha" {...a} {...register('senha')} />}
        </Campo>
        <Campo rotulo="Confirmar senha" erro={errors.confirmarSenha?.message}>
          {(a) => <input className="entrada" type="password" autoComplete="new-password" placeholder="Repita a senha" {...a} {...register('confirmarSenha')} />}
        </Campo>
        <Campo rotulo="Telefone (opcional)" erro={errors.telefone?.message} ajuda="Usado só para avisos por SMS, se você aceitar receber.">
          {(a) => (
            <input
              className="entrada"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="(44) 99999-9999"
              {...a}
              {...register('telefone', { onChange: (e) => setValue('telefone', mascararTelefone(e.target.value)) })}
            />
          )}
        </Campo>
        <button type="submit" className="botao botao--bloco" disabled={isSubmitting}>
          {isSubmitting ? 'Criando conta…' : 'Criar conta'}
        </button>
        <p className="texto-suave texto-pequeno">
          Já possui conta? <Link to="/entrar" state={local.state}>Entrar</Link>
        </p>
      </form>
    </main>
  )
}
