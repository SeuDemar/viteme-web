import { useQuery } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { validarCertificado } from '../../api/notificacoes'
import { Campo } from '../../components/Campo'
import { Carregando } from '../../components/Estados'
import { Selo } from '../../components/Selo'
import { dataLonga, dataNumerica } from '../../lib/formatar'
import { mapearErro } from '../../lib/erros'
import { useTitulo } from '../../lib/formulario'

const CODIGO_VALIDO = /^[A-Za-z0-9]{1,20}$/

export function ValidarCertificadoPage() {
  useTitulo('Validar certificado')
  const { codigo } = useParams()
  const navegar = useNavigate()
  const [digitado, setDigitado] = useState(codigo ?? '')
  const [erroCampo, setErroCampo] = useState<string>()

  const consulta = useQuery({
    queryKey: ['certificado', codigo],
    queryFn: () => validarCertificado(codigo!),
    enabled: Boolean(codigo) && CODIGO_VALIDO.test(codigo ?? ''),
    retry: false,
  })

  const validar = (e: FormEvent) => {
    e.preventDefault()
    const limpo = digitado.trim()
    if (!CODIGO_VALIDO.test(limpo)) {
      setErroCampo('Informe o código do certificado (até 20 letras e números).')
      return
    }
    setErroCampo(undefined)
    navegar(`/certificados/${limpo}`)
  }

  const erro = consulta.isError ? mapearErro(consulta.error) : null
  const naoEncontrado = erro?.codigo === 'CERTIFICADO_NAO_ENCONTRADO' || erro?.status === 404

  return (
    <main className="pagina pagina--estreita" id="conteudo">
      <h1 className="pagina__titulo">Validar certificado</h1>
      <p className="pagina__sub">Confira a autenticidade de um certificado Viteme.</p>

      <form className="formulario cartao espaco-topo" onSubmit={validar} noValidate>
        <Campo rotulo="Código de validação" erro={erroCampo}>
          {(a) => <input className="entrada" placeholder="Digite o código do certificado" value={digitado} onChange={(e) => setDigitado(e.target.value)} maxLength={20} {...a} />}
        </Campo>
        <button type="submit" className="botao botao--bloco">
          Validar certificado
        </button>
      </form>

      {consulta.isFetching && (
        <div className="espaco-topo">
          <Carregando linhas={1} />
        </div>
      )}

      {consulta.data && (
        <section className="cartao cartao--destaque espaco-topo" aria-live="polite">
          <div className="linha linha--entre">
            <h2 className="cartao__titulo">Resultado da validação</h2>
            <Selo tom="sucesso">VÁLIDO</Selo>
          </div>
          <p className="cartao__meta">Certificado válido • {consulta.data.evento}</p>
          <dl className="fatos">
            <div>
              <dt>Participante</dt>
              <dd>{consulta.data.participante}</dd>
            </div>
            <div>
              <dt>Evento</dt>
              <dd>{consulta.data.evento}</dd>
            </div>
            <div>
              <dt>Data do evento</dt>
              <dd>{dataLonga(consulta.data.dataEvento)}</dd>
            </div>
            {consulta.data.cargaHoraria && (
              <div>
                <dt>Carga horária</dt>
                <dd>{consulta.data.cargaHoraria} horas</dd>
              </div>
            )}
            <div>
              <dt>Emitido em</dt>
              <dd>{dataNumerica(consulta.data.emitidoEm)}</dd>
            </div>
          </dl>
        </section>
      )}

      {erro && (
        <section className="cartao espaco-topo" role="alert">
          <div className="linha linha--entre">
            <h2 className="cartao__titulo">{naoEncontrado ? 'Certificado não encontrado' : 'Não foi possível validar'}</h2>
            <Selo tom="perigo">{naoEncontrado ? 'INVÁLIDO' : 'ERRO'}</Selo>
          </div>
          <p className="cartao__meta">{naoEncontrado ? 'Confira o código e tente novamente.' : erro.mensagem}</p>
        </section>
      )}
    </main>
  )
}
