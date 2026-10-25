import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { atualizarPerfil, definirAceiteSms, enviarCodigoTelefone, obterPerfil, verificarTelefone } from '../../api/auth'
import type { Perfil } from '../../api/tipos'
import { Campo } from '../../components/Campo'
import { Carregando, Erro } from '../../components/Estados'
import { Selo } from '../../components/Selo'
import { mascararTelefone, telefoneDeE164, telefoneParaE164 } from '../../lib/formatar'
import { mapearErro } from '../../lib/erros'
import { aplicarErrosDosCampos, useTitulo } from '../../lib/formulario'
import { codigoTelefoneSchema, perfilSchema, type CodigoTelefoneForm, type PerfilForm } from '../../schemas/auth'
import { useSessao } from '../auth/sessao'

const INTERVALO_REENVIO_S = 60

function VerificacaoTelefone({ aoVerificar }: { aoVerificar: () => void }) {
  const [enviadoEm, setEnviadoEm] = useState<number | null>(null)
  const [segundos, setSegundos] = useState(0)
  const [mensagem, setMensagem] = useState<string | null>(null)
  const { register, handleSubmit, setError, reset, formState: { errors, isSubmitting } } = useForm<CodigoTelefoneForm>({
    resolver: zodResolver(codigoTelefoneSchema),
    defaultValues: { codigo: '' },
  })

  // Contador de reenvio: liberado 60 s depois do último envio (RN18).
  useEffect(() => {
    if (enviadoEm === null) return
    const atualizar = () => setSegundos(Math.max(0, INTERVALO_REENVIO_S - Math.floor((Date.now() - enviadoEm) / 1000)))
    atualizar()
    const id = setInterval(atualizar, 1000)
    return () => clearInterval(id)
  }, [enviadoEm])

  const enviar = useMutation({
    mutationFn: enviarCodigoTelefone,
    onSuccess: () => {
      setMensagem(null)
      setEnviadoEm(Date.now())
      reset()
    },
    onError: (e) => {
      const erro = mapearErro(e)
      if (erro.codigo === 'AGUARDE_NOVO_CODIGO') setEnviadoEm(Date.now())
      setMensagem(erro.mensagem)
    },
  })

  const confirmar = handleSubmit(async ({ codigo }) => {
    setMensagem(null)
    try {
      await verificarTelefone(codigo)
      aoVerificar()
    } catch (e) {
      const erro = mapearErro(e)
      if (!aplicarErrosDosCampos(erro, setError, ['codigo'])) setMensagem(erro.mensagem)
    }
  })

  return (
    <section className="cartao" aria-label="Verificação do telefone">
      <h2 className="cartao__titulo">Verificar telefone</h2>
      <p className="cartao__meta">Enviaremos um código de 6 dígitos por SMS. Ele vale por 10 minutos.</p>
      {mensagem && (
        <p className="alerta alerta--erro espaco-topo" role="alert">
          {mensagem}
        </p>
      )}
      {enviadoEm === null ? (
        <button type="button" className="botao botao--secundario espaco-topo" onClick={() => enviar.mutate()} disabled={enviar.isPending}>
          {enviar.isPending ? 'Enviando…' : 'Enviar código'}
        </button>
      ) : (
        <form className="formulario espaco-topo" onSubmit={confirmar} noValidate>
          <Campo rotulo="Código recebido" erro={errors.codigo?.message}>
            {(a) => <input className="entrada" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000" {...a} {...register('codigo')} />}
          </Campo>
          <div className="linha">
            <button type="submit" className="botao" disabled={isSubmitting}>
              {isSubmitting ? 'Verificando…' : 'Confirmar código'}
            </button>
            <button type="button" className="botao botao--contorno" onClick={() => enviar.mutate()} disabled={segundos > 0 || enviar.isPending}>
              {segundos > 0 ? `Reenviar em ${segundos}s` : 'Reenviar código'}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}

function FormularioPerfil({ perfil }: { perfil: Perfil }) {
  const queryClient = useQueryClient()
  const { atualizarUsuario } = useSessao()
  const [mensagem, setMensagem] = useState<{ tom: 'sucesso' | 'erro'; texto: string } | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    control,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<PerfilForm>({
    resolver: zodResolver(perfilSchema),
    defaultValues: { nome: perfil.nome, telefone: telefoneDeE164(perfil.telefone) },
  })

  const atualizarCache = (novo: Perfil) => {
    queryClient.setQueryData(['perfil'], novo)
    atualizarUsuario({ nome: novo.nome, telefoneVerificado: novo.telefoneVerificado, aceitaSms: novo.aceitaSms })
  }

  const salvar = handleSubmit(async (dados) => {
    setMensagem(null)
    try {
      const novo = await atualizarPerfil(dados.nome, telefoneParaE164(dados.telefone))
      atualizarCache(novo)
      reset({ nome: novo.nome, telefone: telefoneDeE164(novo.telefone) })
      setMensagem({ tom: 'sucesso', texto: 'Perfil atualizado.' })
    } catch (e) {
      const erro = mapearErro(e)
      if (!aplicarErrosDosCampos(erro, setError, ['nome', 'telefone'])) setMensagem({ tom: 'erro', texto: erro.mensagem })
    }
  })

  const sms = useMutation({
    mutationFn: (aceita: boolean) => definirAceiteSms(aceita),
    onSuccess: (r) => atualizarCache({ ...perfil, aceitaSms: r.aceitaSms, aceiteSmsEm: r.aceiteSmsEm }),
    onError: (e) => setMensagem({ tom: 'erro', texto: mapearErro(e).mensagem }),
  })

  const telefoneAtual = telefoneParaE164(useWatch({ control, name: 'telefone' }))
  const trocandoTelefone = Boolean(perfil.telefone) && telefoneAtual !== perfil.telefone

  const telefoneSalvo = Boolean(perfil.telefone)
  const seloTelefone = !telefoneSalvo ? <Selo tom="neutro">Sem telefone</Selo> : perfil.telefoneVerificado ? <Selo tom="sucesso">Telefone verificado</Selo> : <Selo tom="aviso">Telefone não verificado</Selo>

  return (
    <div className="pilha pilha--grande espaco-topo">
      <form className="formulario cartao" onSubmit={salvar} noValidate>
        {mensagem && (
          <p className={`alerta alerta--${mensagem.tom}`} role={mensagem.tom === 'erro' ? 'alert' : 'status'}>
            {mensagem.texto}
          </p>
        )}
        <Campo rotulo="Nome" erro={errors.nome?.message}>
          {(a) => <input className="entrada" autoComplete="name" {...a} {...register('nome')} />}
        </Campo>
        <Campo rotulo="E-mail" ajuda="O e-mail não pode ser alterado.">
          {(a) => <input className="entrada" value={perfil.email} readOnly {...a} />}
        </Campo>
        <Campo rotulo="Telefone" erro={errors.telefone?.message}>
          {(a) => (
            <input
              className="entrada"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="(44) 99999-9999"
              {...a}
              {...register('telefone', { onChange: (e) => setValue('telefone', mascararTelefone(e.target.value), { shouldDirty: true }) })}
            />
          )}
        </Campo>
        <div className="linha">{seloTelefone}</div>
        {trocandoTelefone && (perfil.telefoneVerificado || perfil.aceitaSms) && (
          <p className="alerta alerta--aviso">Trocar o telefone desfaz a verificação e o aceite de avisos por SMS.</p>
        )}
        <button type="submit" className="botao botao--secundario botao--bloco" disabled={isSubmitting || !isDirty}>
          {isSubmitting ? 'Salvando…' : 'Salvar perfil'}
        </button>
      </form>

      {telefoneSalvo && !perfil.telefoneVerificado && !isDirty && <VerificacaoTelefone aoVerificar={() => void queryClient.invalidateQueries({ queryKey: ['perfil'] })} />}

      <section className="cartao" aria-label="Avisos por SMS">
        <div className="linha linha--entre">
          <h2 className="cartao__titulo">Avisos por SMS</h2>
          {perfil.aceitaSms ? <Selo tom="sucesso">ATIVO</Selo> : <Selo tom="neutro">DESATIVADO</Selo>}
        </div>
        <p className="cartao__meta">Receba confirmações e mudanças nos eventos.</p>
        {!perfil.telefoneVerificado && <p className="texto-suave texto-pequeno espaco-topo">Verifique seu telefone para ativar os avisos por SMS.</p>}
        <button
          type="button"
          className={`botao botao--bloco espaco-topo${perfil.aceitaSms ? ' botao--contorno' : ''}`}
          disabled={!perfil.telefoneVerificado || sms.isPending}
          onClick={() => sms.mutate(!perfil.aceitaSms)}
        >
          {perfil.aceitaSms ? 'Desativar avisos por SMS' : 'Ativar avisos por SMS'}
        </button>
      </section>
    </div>
  )
}

export function PerfilPage() {
  useTitulo('Meu perfil')
  const consulta = useQuery({ queryKey: ['perfil'], queryFn: obterPerfil })

  return (
    <main className="pagina pagina--estreita" id="conteudo">
      <h1 className="pagina__titulo">Meu perfil</h1>
      {consulta.isPending ? (
        <div className="espaco-topo">
          <Carregando />
        </div>
      ) : consulta.isError ? (
        <Erro erro={mapearErro(consulta.error)} aoTentarNovamente={() => consulta.refetch()} />
      ) : (
        // A chave é só o id: remontar ao salvar apagaria a mensagem de confirmação do formulário.
        <FormularioPerfil key={consulta.data.id} perfil={consulta.data} />
      )}
    </main>
  )
}
