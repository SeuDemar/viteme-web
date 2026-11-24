import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { ProvedorDeToasts } from '../components/Toasts'
import { Recebimentos } from '../features/perfil/Recebimentos'
import { valorEmReais } from '../schemas/auth'
import { perfilExemplo, problema, rota, sessaoRestauravel } from './api'
import { renderizarApp } from './render'
import { servidor } from './servidor'

const conta = (parcial: Record<string, unknown> = {}) => ({
  situacao: 'PENDENTE',
  urlOnboarding: 'https://sandbox.asaas.com/onboarding/abc',
  criadoEm: '2026-11-24T12:00:00Z',
  aprovadaEm: null,
  garantiaHabilitada: false,
  ...parcial,
})

function renderizar() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <ProvedorDeToasts>
        <Recebimentos perfil={{ ...perfilExemplo, telefone: '+5544999990000' }} />
      </ProvedorDeToasts>
    </QueryClientProvider>,
  )
}

describe('valor em reais digitado', () => {
  it.each([
    ['5000', 5000],
    ['5.000', 5000],
    ['5.000,50', 5000.5],
    ['R$ 1.234.567,89', 1234567.89],
    ['5000.50', 5000.5],
  ])('"%s" vale %d', (texto, valor) => expect(valorEmReais(texto)).toBe(valor))
})

describe('Recebimentos do organizador (E41/E42)', () => {
  it('sem conta, mostra o formulário e abre a conta com os dados da empresa', async () => {
    let enviado: unknown
    servidor.use(
      http.get(rota('/usuarios/me/conta-recebimento'), () =>
        problema(404, 'CONTA_RECEBIMENTO_NAO_ENCONTRADA', 'Você ainda não abriu a conta de recebimento.'),
      ),
      http.post(rota('/usuarios/me/conta-recebimento'), async ({ request }) => {
        enviado = await request.json()
        return HttpResponse.json(conta(), { status: 201 })
      }),
    )
    const usuario = userEvent.setup()
    renderizar()

    await usuario.click(await screen.findByRole('combobox', { name: 'Tipo de empresa' }))
    await usuario.click(screen.getByRole('option', { name: 'Associação (centro acadêmico, atlética)' }))
    expect(screen.getByLabelText('Telefone da empresa')).toHaveValue('(44) 99999-0000')
    await usuario.type(screen.getByLabelText('Faturamento mensal (R$)'), '5.000,00')
    await usuario.type(screen.getByLabelText('CEP'), '87020000')
    expect(screen.getByLabelText('CEP')).toHaveValue('87020-000')
    await usuario.type(screen.getByLabelText('Endereço'), 'Av. Colombo')
    await usuario.type(screen.getByLabelText('Número'), '5790')
    await usuario.type(screen.getByLabelText('Bairro'), 'Zona 7')
    await usuario.type(screen.getByLabelText('E-mail da empresa (opcional)'), 'financeiro@ca.org.br')
    await usuario.click(screen.getByRole('button', { name: 'Abrir conta de recebimento' }))

    expect(await screen.findByText('Em análise')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Enviar documentos' })).toHaveAttribute('href', 'https://sandbox.asaas.com/onboarding/abc')
    expect(enviado).toEqual({
      tipoEmpresa: 'ASSOCIATION',
      telefone: '+5544999990000',
      faturamentoMensal: 5000,
      cep: '87020-000',
      endereco: 'Av. Colombo',
      numero: '5790',
      bairro: 'Zona 7',
      email: 'financeiro@ca.org.br',
    })
  })

  it('recusa do meio de pagamento aparece com o motivo', async () => {
    servidor.use(
      http.get(rota('/usuarios/me/conta-recebimento'), () => problema(404, 'CONTA_RECEBIMENTO_NAO_ENCONTRADA', 'Sem conta.')),
      http.post(rota('/usuarios/me/conta-recebimento'), () =>
        problema(422, 'CONTA_RECEBIMENTO_RECUSADA', 'O meio de pagamento recusou os dados: O email teste@exemplo.com já está em uso.'),
      ),
    )
    const usuario = userEvent.setup()
    renderizar()

    await usuario.click(await screen.findByRole('combobox', { name: 'Tipo de empresa' }))
    await usuario.click(screen.getByRole('option', { name: 'MEI' }))
    await usuario.type(screen.getByLabelText('Faturamento mensal (R$)'), '1000')
    await usuario.type(screen.getByLabelText('CEP'), '87020000')
    await usuario.type(screen.getByLabelText('Endereço'), 'Rua A')
    await usuario.type(screen.getByLabelText('Número'), '1')
    await usuario.type(screen.getByLabelText('Bairro'), 'Centro')
    await usuario.click(screen.getByRole('button', { name: 'Abrir conta de recebimento' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('O email teste@exemplo.com já está em uso.')
  })

  it('dados incompletos são barrados no formulário, sem chamar a API', async () => {
    let chamou = false
    servidor.use(
      http.get(rota('/usuarios/me/conta-recebimento'), () => problema(404, 'CONTA_RECEBIMENTO_NAO_ENCONTRADA', 'Sem conta.')),
      http.post(rota('/usuarios/me/conta-recebimento'), () => {
        chamou = true
        return HttpResponse.json(conta(), { status: 201 })
      }),
    )
    const usuario = userEvent.setup()
    renderizar()

    await usuario.click(await screen.findByRole('button', { name: 'Abrir conta de recebimento' }))

    expect(await screen.findByText('Escolha o tipo de empresa.')).toBeInTheDocument()
    expect(screen.getByText('Informe o CEP com 8 dígitos.')).toBeInTheDocument()
    expect(chamou).toBe(false)
  })

  it('conta aprovada mostra a data e como o valor é repassado, sem botão de documentos', async () => {
    servidor.use(
      http.get(rota('/usuarios/me/conta-recebimento'), () =>
        HttpResponse.json(conta({ situacao: 'APROVADA', aprovadaEm: '2026-11-25T12:00:00Z', garantiaHabilitada: true })),
      ),
    )
    renderizar()

    expect(await screen.findByText('Aprovada')).toBeInTheDocument()
    expect(screen.getByText('Liberado 2 dias depois do término do evento')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Enviar documentos' })).not.toBeInTheDocument()
  })

  it('conta pendente pode ser atualizada e passa a aprovada', async () => {
    let consultas = 0
    servidor.use(
      http.get(rota('/usuarios/me/conta-recebimento'), () => {
        consultas += 1
        return HttpResponse.json(consultas === 1 ? conta() : conta({ situacao: 'APROVADA', aprovadaEm: '2026-11-25T12:00:00Z' }))
      }),
    )
    const usuario = userEvent.setup()
    renderizar()

    await usuario.click(await screen.findByRole('button', { name: 'Atualizar situação' }))

    expect(await screen.findByText('Aprovada')).toBeInTheDocument()
    expect(screen.getByText('Direto na conta')).toBeInTheDocument()
  })

  it('desligada na API, a seção não aparece', async () => {
    servidor.use(
      http.get(rota('/usuarios/me/conta-recebimento'), () => problema(404, 'RECEBIMENTOS_DESABILITADOS', 'Indisponível.')),
    )
    const { container } = renderizar()

    await expect.poll(() => container.querySelector('section')).toBeNull()
  })

  it('sem VITE_RECEBIMENTOS, o perfil não mostra a seção nem consulta a conta', async () => {
    const { handlers } = sessaoRestauravel()
    let consultou = false
    servidor.use(
      http.get(rota('/usuarios/me/conta-recebimento'), () => {
        consultou = true
        return HttpResponse.json(conta())
      }),
      ...handlers,
    )
    renderizarApp('/perfil')

    expect(await screen.findByRole('heading', { name: 'Dados de organizador' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Recebimentos' })).not.toBeInTheDocument()
    expect(consultou).toBe(false)
  })
})
