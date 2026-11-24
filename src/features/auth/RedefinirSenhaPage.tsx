import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useSearchParams } from 'react-router-dom'
import { redefinirSenha } from '../../api/auth'
import { Campo } from '../../components/Campo'
import { CampoSenha } from '../../components/CampoSenha'
import { mapearErro } from '../../lib/erros'
import { useTitulo } from '../../lib/formulario'
import { redefinirSenhaSchema, type RedefinirSenhaForm } from '../../schemas/auth'

/** E44: define a nova senha com o token do link recebido por e-mail (`?token=`). */
export function RedefinirSenhaPage() {
  useTitulo('Redefinir senha', { indexar: false })
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [concluido, setConcluido] = useState(false)
  const [mensagem, setMensagem] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RedefinirSenhaForm>({ resolver: zodResolver(redefinirSenhaSchema), defaultValues: { novaSenha: '', confirmarSenha: '' } })

  const enviar = handleSubmit(async ({ novaSenha }) => {
    setMensagem(null)
    try {
      await redefinirSenha(token, novaSenha)
      setConcluido(true)
    } catch (e) {
      setMensagem(mapearErro(e).mensagem)
    }
  })

  if (concluido) {
    return (
      <main className="pagina pagina--estreita" id="conteudo">
        <h1 className="pagina__titulo">Senha alterada</h1>
        <div className="cartao espaco-topo" role="status">
          <p>Sua senha foi redefinida e as sessões abertas foram encerradas. Entre com a nova senha.</p>
          <Link to="/entrar" className="botao botao--bloco">
            Entrar
          </Link>
        </div>
      </main>
    )
  }

  if (!token) {
    return (
      <main className="pagina pagina--estreita" id="conteudo">
        <h1 className="pagina__titulo">Link inválido</h1>
        <div className="cartao espaco-topo">
          <p>O link de redefinição está incompleto. Peça um novo.</p>
          <Link to="/esqueci-senha" className="botao botao--bloco">
            Pedir novo link
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="pagina pagina--estreita" id="conteudo">
      <h1 className="pagina__titulo">Criar nova senha</h1>
      <p className="pagina__sub">Escolha uma senha com pelo menos 8 caracteres, uma letra e um número.</p>

      <form className="formulario cartao espaco-topo" onSubmit={enviar} noValidate>
        {mensagem && (
          <p className="alerta alerta--erro" role="alert">
            {mensagem} <Link to="/esqueci-senha">Pedir novo link</Link>
          </p>
        )}
        <Campo rotulo="Nova senha" erro={errors.novaSenha?.message}>
          {(a) => <CampoSenha autoComplete="new-password" placeholder="Crie uma senha" {...a} {...register('novaSenha')} />}
        </Campo>
        <Campo rotulo="Confirmar senha" erro={errors.confirmarSenha?.message}>
          {(a) => <CampoSenha autoComplete="new-password" placeholder="Repita a senha" {...a} {...register('confirmarSenha')} />}
        </Campo>
        <button type="submit" className="botao botao--bloco" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando…' : 'Salvar nova senha'}
        </button>
      </form>
    </main>
  )
}
