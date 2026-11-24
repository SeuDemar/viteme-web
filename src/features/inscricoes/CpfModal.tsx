import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { definirCpf } from '../../api/auth'
import { Campo } from '../../components/Campo'
import { Modal } from '../../components/Modal'
import { mapearErro } from '../../lib/erros'
import { cpfSchema, type CpfForm } from '../../schemas/auth'

/** Máscara 000.000.000-00 enquanto digita. */
function mascarar(valor: string) {
  const d = valor.replace(/\D/g, '').slice(0, 11)
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2')
}

interface CpfModalProps {
  aoFechar: () => void
  /** Chamado depois que a API guardou o CPF; quem abriu o modal repete a ação que exigia o CPF. */
  aoSalvar: () => void
}

/** E45: o meio de pagamento (Asaas) só cobra com o CPF do pagador. Pedido só na hora de pagar, nunca no cadastro. */
export function CpfModal({ aoFechar, aoSalvar }: CpfModalProps) {
  const [mensagem, setMensagem] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CpfForm>({ resolver: zodResolver(cpfSchema), defaultValues: { cpf: '' } })

  const salvar = handleSubmit(async ({ cpf }) => {
    setMensagem(null)
    try {
      await definirCpf(cpf)
      aoSalvar()
    } catch (e) {
      setMensagem(mapearErro(e).mensagem)
    }
  })

  return (
    <Modal
      titulo="Informe seu CPF"
      aoFechar={aoFechar}
      acoes={
        <>
          <button type="button" className="botao botao--contorno" onClick={aoFechar}>
            Cancelar
          </button>
          <button type="submit" form="form-cpf" className="botao" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando…' : 'Salvar e continuar'}
          </button>
        </>
      }
    >
      <form id="form-cpf" className="formulario" onSubmit={salvar} noValidate>
        <p className="texto-suave">O CPF é exigido pelo meio de pagamento (Pix) para emitir a cobrança. Guardamos só para isso e não o mostramos a outras pessoas.</p>
        {mensagem && (
          <p className="alerta alerta--erro" role="alert">
            {mensagem}
          </p>
        )}
        <Campo rotulo="CPF" erro={errors.cpf?.message}>
          {(a) => (
            <input
              className="entrada"
              inputMode="numeric"
              autoComplete="off"
              placeholder="000.000.000-00"
              {...a}
              {...register('cpf', { onChange: (e) => setValue('cpf', mascarar(e.target.value)) })}
            />
          )}
        </Campo>
      </form>
    </Modal>
  )
}
