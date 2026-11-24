import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cpfValido } from '../schemas/auth'
import { eventoDetalhe, inscricaoExemplo, problema, rota, sessaoRestauravel } from './api'
import { renderizarApp } from './render'
import { servidor } from './servidor'

const inscricaoPaga = { id: 'i-1', status: 'PENDENTE_PAGAMENTO', codigoCheckin: null, reservadaAte: '2099-01-01T00:00:00Z', pagamento: { id: 'p-1', valor: 25, urlPagamento: 'https://sandbox.asaas.com/i/abc' } }
const minhaPendente = () =>
  inscricaoExemplo({ status: 'PENDENTE_PAGAMENTO', reservadaAte: '2099-01-01T00:00:00Z', evento: { id: 'e-1', titulo: 'Workshop de Inteligência Artificial', dataInicio: '2099-11-18T17:00:00Z', local: 'Laboratório 04' } })
const statusPendente = http.get(rota('/inscricoes/i-1/pagamento'), () =>
  HttpResponse.json({ status: 'PENDENTE', valor: 25, metodo: null, atualizadoEm: '2099-01-01T00:00:00Z', statusInscricao: 'PENDENTE_PAGAMENTO' }),
)

describe('validação do CPF', () => {
  it.each(['123.456.789-09', '12345678909', '529.982.247-25'])('aceita %s', (cpf) => expect(cpfValido(cpf)).toBe(true))
  it.each(['', '123', '111.111.111-11', '123.456.789-00', '1234567890a'])('recusa "%s"', (cpf) => expect(cpfValido(cpf)).toBe(false))
})

describe('CPF do pagador (E45)', () => {
  it('CPF_OBRIGATORIO abre o pedido de CPF e, salvo o CPF, repete a inscrição e vai ao pagamento', async () => {
    const { handlers } = sessaoRestauravel()
    let tentativas = 0
    let cpfEnviado: unknown
    servidor.use(
      http.get(rota('/eventos/e-1'), () => HttpResponse.json(eventoDetalhe({ preco: 25 }))),
      http.post(rota('/eventos/e-1/inscricoes'), () => {
        tentativas += 1
        return tentativas === 1 ? problema(422, 'CPF_OBRIGATORIO', 'Informe seu CPF para pagar esta inscrição.') : HttpResponse.json(inscricaoPaga, { status: 201 })
      }),
      http.put(rota('/usuarios/me/cpf'), async ({ request }) => {
        cpfEnviado = await request.json()
        return HttpResponse.json({ temCpf: true, cpfMascarado: '***.***.***-09' })
      }),
      http.get(rota('/inscricoes/minhas'), () => HttpResponse.json([minhaPendente()])),
      statusPendente,
      http.get(rota('/inscricoes/i-1/pagamento/pix'), () => problema(404, 'PIX_INDISPONIVEL', 'Sem QR Code.')),
      ...handlers,
    )
    const usuario = userEvent.setup()
    renderizarApp('/eventos/e-1')

    await usuario.click(await screen.findByRole('button', { name: /Inscrever-se por/ }))
    expect(await screen.findByRole('dialog', { name: 'Informe seu CPF' })).toBeInTheDocument()
    await usuario.type(screen.getByLabelText('CPF'), '12345678909')
    expect(screen.getByLabelText('CPF')).toHaveValue('123.456.789-09')
    await usuario.click(screen.getByRole('button', { name: 'Salvar e continuar' }))

    expect(await screen.findByRole('heading', { name: 'Pagamento' })).toBeInTheDocument()
    expect(cpfEnviado).toEqual({ cpf: '123.456.789-09' })
    expect(tentativas).toBe(2)
  })

  it('CPF inválido é barrado no formulário, sem chamar a API', async () => {
    const { handlers } = sessaoRestauravel()
    let chamouCpf = false
    servidor.use(
      http.get(rota('/eventos/e-1'), () => HttpResponse.json(eventoDetalhe({ preco: 25 }))),
      http.post(rota('/eventos/e-1/inscricoes'), () => problema(422, 'CPF_OBRIGATORIO', 'Informe seu CPF.')),
      http.put(rota('/usuarios/me/cpf'), () => {
        chamouCpf = true
        return HttpResponse.json({})
      }),
      ...handlers,
    )
    const usuario = userEvent.setup()
    renderizarApp('/eventos/e-1')

    await usuario.click(await screen.findByRole('button', { name: /Inscrever-se por/ }))
    await usuario.type(await screen.findByLabelText('CPF'), '11111111111')
    await usuario.click(screen.getByRole('button', { name: 'Salvar e continuar' }))

    expect(await screen.findByText('Informe um CPF válido.')).toBeInTheDocument()
    expect(chamouCpf).toBe(false)
  })
})

describe('Pix na tela de pagamento (E46)', () => {
  it('mostra o QR Code e o copia e cola quando a API devolve o Pix', async () => {
    const { handlers } = sessaoRestauravel()
    servidor.use(
      http.get(rota('/inscricoes/minhas'), () => HttpResponse.json([minhaPendente()])),
      statusPendente,
      http.get(rota('/inscricoes/i-1/pagamento/pix'), () => HttpResponse.json({ copiaECola: '00020126580014br.gov.bcb.pix', imagemBase64: 'iVBORw0KGgo=', expiraEm: null })),
      ...handlers,
    )
    renderizarApp('/inscricoes/i-1/pagamento')

    expect(await screen.findByRole('heading', { name: 'Pague com Pix' })).toBeInTheDocument()
    expect(screen.getByAltText('QR Code do Pix para pagar a inscrição')).toHaveAttribute('src', 'data:image/png;base64,iVBORw0KGgo=')
    expect(screen.getByLabelText('Pix copia e cola')).toHaveValue('00020126580014br.gov.bcb.pix')
    expect(screen.getByRole('button', { name: 'Copiar código Pix' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Abrir página de pagamento' })).toBeInTheDocument()
  })

  it('sem QR Code (PIX_INDISPONIVEL) mantém só o botão para a página de pagamento', async () => {
    const { handlers } = sessaoRestauravel()
    servidor.use(
      http.get(rota('/inscricoes/minhas'), () => HttpResponse.json([minhaPendente()])),
      statusPendente,
      http.get(rota('/inscricoes/i-1/pagamento/pix'), () => problema(404, 'PIX_INDISPONIVEL', 'Sem QR Code.')),
      ...handlers,
    )
    renderizarApp('/inscricoes/i-1/pagamento')

    expect(await screen.findByRole('button', { name: 'Ir para pagamento' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Pague com Pix' })).not.toBeInTheDocument()
  })
})

describe('Simulador de pagamento (demonstração)', () => {
  afterEach(() => vi.unstubAllEnvs())

  const cobranca = http.post(rota('/inscricoes/i-1/pagamento'), () =>
    HttpResponse.json({ pagamentoId: 'p-1', status: 'PENDENTE', valor: 25, urlPagamento: 'https://sandbox.asaas.com/i/abc' }),
  )

  it('com o Asaas sandbox (há QR Code), aprova pelo id do pagamento e não oferece recusa', async () => {
    vi.stubEnv('VITE_SIMULADOR_PAGAMENTO', 'true')
    const { handlers } = sessaoRestauravel()
    let simulado: string | null = null
    servidor.use(
      http.get(rota('/inscricoes/minhas'), () => HttpResponse.json([minhaPendente()])),
      statusPendente,
      http.get(rota('/inscricoes/i-1/pagamento/pix'), () => HttpResponse.json({ copiaECola: '000201', imagemBase64: 'iVBORw0KGgo=', expiraEm: null })),
      cobranca,
      http.post(rota('/simulador/pagamentos/:id/:resultado'), ({ params }) => {
        simulado = `${params.id}/${params.resultado}`
        return HttpResponse.json({ processado: true })
      }),
      ...handlers,
    )
    const usuario = userEvent.setup()
    renderizarApp('/inscricoes/i-1/pagamento')

    await screen.findByRole('heading', { name: 'Pague com Pix' })
    expect(screen.queryByRole('button', { name: 'Simular recusa' })).not.toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Simular pagamento aprovado' }))

    await expect.poll(() => simulado).toBe('p-1/aprovar')
  })

  it('com o gateway simulado (sem QR Code), oferece aprovar e recusar', async () => {
    vi.stubEnv('VITE_SIMULADOR_PAGAMENTO', 'true')
    const { handlers } = sessaoRestauravel()
    servidor.use(
      http.get(rota('/inscricoes/minhas'), () => HttpResponse.json([minhaPendente()])),
      statusPendente,
      http.get(rota('/inscricoes/i-1/pagamento/pix'), () => problema(404, 'PIX_INDISPONIVEL', 'Sem QR Code.')),
      ...handlers,
    )
    renderizarApp('/inscricoes/i-1/pagamento')

    expect(await screen.findByRole('button', { name: 'Simular recusa' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Simular pagamento aprovado' })).toBeInTheDocument()
  })
})
