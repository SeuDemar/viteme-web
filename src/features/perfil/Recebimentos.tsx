import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { criarContaRecebimento, obterContaRecebimento } from '../../api/auth'
import type { ContaRecebimento, Perfil, SituacaoContaRecebimento } from '../../api/tipos'
import { Campo } from '../../components/Campo'
import { Carregando } from '../../components/Estados'
import { Icone } from '../../components/Icone'
import { Seletor } from '../../components/Seletor'
import { Selo } from '../../components/Selo'
import { useToast } from '../../components/Toasts'
import { mapearErro } from '../../lib/erros'
import { dataCurta, mascararTelefone, telefoneDeE164, telefoneParaE164 } from '../../lib/formatar'
import { aplicarErrosDosCampos } from '../../lib/formulario'
import { contaRecebimentoSchema, valorEmReais, type ContaRecebimentoForm } from '../../schemas/auth'

/**
 * Seção "Recebimentos" do perfil (Fase 2 do Asaas): só aparece com `VITE_RECEBIMENTOS=true`, junto com
 * `Gateway__Asaas__Subcontas__Habilitar=true` na API.
 */
export const RECEBIMENTOS = import.meta.env.VITE_RECEBIMENTOS === 'true'

const TIPOS_EMPRESA = [
  { valor: 'MEI', rotulo: 'MEI' },
  { valor: 'LIMITED', rotulo: 'Sociedade limitada (LTDA)' },
  { valor: 'INDIVIDUAL', rotulo: 'Empresário individual' },
  { valor: 'ASSOCIATION', rotulo: 'Associação (centro acadêmico, atlética)' },
]

const SITUACAO: Record<SituacaoContaRecebimento, [string, 'sucesso' | 'aviso' | 'perigo']> = {
  PENDENTE: ['Em análise', 'aviso'],
  APROVADA: ['Aprovada', 'sucesso'],
  REJEITADA: ['Recusada', 'perigo'],
}

const mascararCep = (valor: string) => {
  const d = valor.replace(/\D/g, '').slice(0, 8)
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d
}

function SituacaoConta({ conta, atualizando, aoAtualizar }: { conta: ContaRecebimento; atualizando: boolean; aoAtualizar: () => void }) {
  return (
    <>
      {conta.situacao === 'PENDENTE' && (
        <p className="alerta alerta--aviso espaco-topo">
          O meio de pagamento está analisando a conta. Envie os documentos pedidos para concluir; enquanto isso, eventos pagos não podem ser publicados.
        </p>
      )}
      {conta.situacao === 'REJEITADA' && (
        <p className="alerta alerta--erro espaco-topo" role="alert">
          A conta foi recusada na análise. Confira os documentos enviados ou fale com o suporte.
        </p>
      )}
      <dl className="fatos">
        <div>
          <dt>Aberta em</dt>
          <dd>{dataCurta(conta.criadoEm)}</dd>
        </div>
        {conta.aprovadaEm && (
          <div>
            <dt>Aprovada em</dt>
            <dd>{dataCurta(conta.aprovadaEm)}</dd>
          </div>
        )}
        {conta.situacao === 'APROVADA' && (
          <div>
            <dt>Repasse</dt>
            <dd>{conta.garantiaHabilitada ? 'Liberado 2 dias depois do término do evento' : 'Direto na conta'}</dd>
          </div>
        )}
      </dl>
      <div className="linha espaco-topo">
        {conta.urlOnboarding && conta.situacao !== 'APROVADA' && (
          <a className="botao botao--secundario" href={conta.urlOnboarding} target="_blank" rel="noopener noreferrer">
            Enviar documentos
          </a>
        )}
        {conta.situacao !== 'APROVADA' && (
          <button type="button" className="botao botao--contorno" onClick={aoAtualizar} disabled={atualizando}>
            {atualizando ? 'Atualizando…' : 'Atualizar situação'}
          </button>
        )}
      </div>
    </>
  )
}

function FormularioConta({ perfil, aoCriar }: { perfil: Perfil; aoCriar: (conta: ContaRecebimento) => void }) {
  const [mensagem, setMensagem] = useState<string | null>(null)
  const toast = useToast()
  const { register, handleSubmit, setError, setValue, control, formState: { errors, isSubmitting } } = useForm<ContaRecebimentoForm>({
    resolver: zodResolver(contaRecebimentoSchema),
    defaultValues: {
      tipoEmpresa: undefined,
      telefone: telefoneDeE164(perfil.telefone),
      faturamentoMensal: '',
      cep: '',
      endereco: '',
      numero: '',
      complemento: '',
      bairro: '',
    },
  })

  const salvar = handleSubmit(async (dados) => {
    setMensagem(null)
    try {
      const conta = await criarContaRecebimento({
        ...dados,
        telefone: telefoneParaE164(dados.telefone) ?? '',
        faturamentoMensal: valorEmReais(dados.faturamentoMensal),
        complemento: dados.complemento || undefined,
      })
      aoCriar(conta)
      toast.sucesso('Conta de recebimento aberta. Agora envie os documentos para a análise.')
    } catch (e) {
      const erro = mapearErro(e)
      const campos = ['tipoEmpresa', 'telefone', 'faturamentoMensal', 'cep', 'endereco', 'numero', 'complemento', 'bairro'] as const
      if (!aplicarErrosDosCampos(erro, setError, [...campos])) setMensagem(erro.mensagem)
    }
  })

  return (
    <form className="formulario espaco-topo" onSubmit={salvar} noValidate aria-label="Abrir conta de recebimento">
      {mensagem && <p className="alerta alerta--erro" role="alert">{mensagem}</p>}
      <Campo rotulo="Tipo de empresa" erro={errors.tipoEmpresa?.message}>
        {(a) => (
          <Controller
            control={control}
            name="tipoEmpresa"
            render={({ field }) => (
              <Seletor {...a} ref={field.ref} value={field.value ?? ''} onChange={field.onChange} onBlur={field.onBlur} opcoes={TIPOS_EMPRESA} />
            )}
          />
        )}
      </Campo>
      <Campo rotulo="Telefone da empresa" erro={errors.telefone?.message}>
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
      <Campo rotulo="Faturamento mensal (R$)" erro={errors.faturamentoMensal?.message} ajuda="Valor aproximado; o meio de pagamento exige essa informação.">
        {(a) => <input className="entrada" inputMode="decimal" placeholder="5.000,00" {...a} {...register('faturamentoMensal')} />}
      </Campo>
      <Campo rotulo="CEP" erro={errors.cep?.message}>
        {(a) => (
          <input
            className="entrada"
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder="00000-000"
            {...a}
            {...register('cep', { onChange: (e) => setValue('cep', mascararCep(e.target.value)) })}
          />
        )}
      </Campo>
      <Campo rotulo="Endereço" erro={errors.endereco?.message}>
        {(a) => <input className="entrada" autoComplete="address-line1" {...a} {...register('endereco')} />}
      </Campo>
      <Campo rotulo="Número" erro={errors.numero?.message}>
        {(a) => <input className="entrada" {...a} {...register('numero')} />}
      </Campo>
      <Campo rotulo="Complemento" erro={errors.complemento?.message}>
        {(a) => <input className="entrada" autoComplete="address-line2" {...a} {...register('complemento')} />}
      </Campo>
      <Campo rotulo="Bairro" erro={errors.bairro?.message}>
        {(a) => <input className="entrada" {...a} {...register('bairro')} />}
      </Campo>
      <button type="submit" className="botao botao--secundario" disabled={isSubmitting}>
        {!isSubmitting && <Icone nome="check" tamanho={18} />}
        {isSubmitting ? 'Abrindo…' : 'Abrir conta de recebimento'}
      </button>
    </form>
  )
}

/** Conta de recebimento do organizador (E41/E42). Eventos pagos exigem a conta aprovada (RN25). */
export function Recebimentos({ perfil }: { perfil: Perfil }) {
  const queryClient = useQueryClient()
  const consulta = useQuery({ queryKey: ['conta-recebimento'], queryFn: obterContaRecebimento, retry: false })
  const erro = consulta.isError ? mapearErro(consulta.error) : null

  // Desligado na API: a seção não aparece.
  if (erro?.codigo === 'RECEBIMENTOS_DESABILITADOS') return null

  const conta = consulta.data
  const [rotulo, tom] = conta ? SITUACAO[conta.situacao] : ['Sem conta', 'neutro' as const]

  return (
    <section className="cartao" aria-label="Recebimentos" id="recebimentos">
      <div className="linha linha--entre">
        <h2 className="cartao__titulo">Recebimentos</h2>
        {!consulta.isPending && <Selo tom={tom}>{rotulo}</Selo>}
      </div>
      <p className="cartao__meta">
        O valor das inscrições dos seus eventos pagos vai para esta conta, aberta com o CNPJ do perfil. Eventos pagos só podem ser publicados com ela aprovada.
      </p>
      {consulta.isPending ? (
        <div className="espaco-topo">
          <Carregando />
        </div>
      ) : conta ? (
        <SituacaoConta conta={conta} atualizando={consulta.isFetching} aoAtualizar={() => void consulta.refetch()} />
      ) : erro?.codigo === 'CONTA_RECEBIMENTO_NAO_ENCONTRADA' ? (
        <FormularioConta perfil={perfil} aoCriar={(nova) => queryClient.setQueryData(['conta-recebimento'], nova)} />
      ) : (
        <p className="alerta alerta--erro espaco-topo" role="alert">
          {erro?.mensagem}{' '}
          <button type="button" className="botao-link" onClick={() => void consulta.refetch()}>
            Tentar novamente
          </button>
        </p>
      )}
    </section>
  )
}
