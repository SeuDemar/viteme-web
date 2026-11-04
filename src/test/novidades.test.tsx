import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { eventoDetalhe, inscricaoExemplo, perfilExemplo, problema, rota, sessaoRestauravel } from './api'
import { renderizarApp } from './render'
import { servidor } from './servidor'

// Pedidos da equipe de 2026-11-03: toasts, linha do tempo, QR code no check-in, colaborador inscrito e início futuro.

const gestao = (extra: Parameters<typeof eventoDetalhe>[0] = {}) => [
  http.get(rota('/eventos/e-1'), () => HttpResponse.json(eventoDetalhe({ souColaborador: true, ...extra }))),
  http.get(rota('/eventos/e-1/inscricoes'), () => HttpResponse.json({ itens: [], pagina: 1, tamanhoPagina: 20, total: 0 })),
]

describe('toasts', () => {
  it('CTW31 — salvar o perfil mostra um aviso que some ao fechar', async () => {
    const { handlers } = sessaoRestauravel()
    servidor.use(http.put(rota('/usuarios/me'), () => HttpResponse.json({ ...perfilExemplo, nome: 'Maria Souza' })), ...handlers)
    const usuario = userEvent.setup()
    renderizarApp('/perfil')

    const nome = await screen.findByLabelText('Nome')
    await usuario.clear(nome)
    await usuario.type(nome, 'Maria Souza')
    await usuario.click(screen.getByRole('button', { name: 'Salvar perfil' }))

    const avisos = screen.getByRole('region', { name: 'Avisos' })
    expect(await within(avisos).findByText('Perfil atualizado.')).toBeInTheDocument()
    await usuario.click(within(avisos).getByRole('button', { name: 'Fechar aviso' }))
    expect(within(avisos).queryByText('Perfil atualizado.')).not.toBeInTheDocument()
  })
})

describe('cabeçalho', () => {
  it('CTW32 — perfil e saída ficam no menu do avatar; Escape fecha o menu', async () => {
    const { handlers } = sessaoRestauravel()
    servidor.use(...handlers, http.get(rota('/eventos'), () => HttpResponse.json({ itens: [], pagina: 1, tamanhoPagina: 12, total: 0 })))
    const usuario = userEvent.setup()
    renderizarApp('/')

    const conta = await screen.findByRole('button', { name: `Conta de ${perfilExemplo.nome}` })
    expect(conta).toHaveTextContent('MO')
    expect(screen.getByRole('link', { name: 'Notificações' })).toHaveAttribute('href', '/notificacoes')
    await usuario.click(conta)
    expect(conta).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('link', { name: 'Meu perfil' })).toHaveAttribute('href', '/perfil')
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('link', { name: 'Meu perfil' })).not.toBeInTheDocument()
  })
})

describe('programação', () => {
  it('CTW33 — a programação aparece em ordem, como linha do tempo, com início e fim', async () => {
    servidor.use(
      http.post(rota('/auth/renovar'), () => problema(401, 'TOKEN_INVALIDO', 'Token inválido.')),
      http.get(rota('/eventos/e-1'), () =>
        HttpResponse.json(
          eventoDetalhe({
            atividades: [
              { id: 'a-2', titulo: 'Encerramento', palestrante: null, local: 'Auditório', inicio: '2026-11-12T23:30:00Z', fim: '2026-11-13T00:30:00Z' },
              { id: 'a-1', titulo: 'Abertura', palestrante: 'Profa. Ana', local: null, inicio: '2026-11-12T22:00:00Z', fim: '2026-11-12T23:00:00Z' },
            ],
          }),
        ),
      ),
    )
    renderizarApp('/eventos/e-1')

    await screen.findByText('Abertura')
    const linha = document.querySelector('.linha-do-tempo')!
    const titulos = [...linha.querySelectorAll('strong')].map((s) => s.textContent)
    expect(titulos).toEqual(['Abertura', 'Encerramento'])
    expect(within(linha as HTMLElement).getByText('Profa. Ana')).toBeInTheDocument()
    expect(linha.querySelectorAll('time')[0]).toHaveAttribute('dateTime', '2026-11-12T22:00:00Z')
  })
})

describe('colaborador inscrito (D52)', () => {
  it('CTW34 — colaborador vê "Gerenciar evento" e também pode se inscrever', async () => {
    const { handlers } = sessaoRestauravel()
    let inscreveu = false
    servidor.use(
      ...handlers,
      http.get(rota('/eventos/e-1'), () => HttpResponse.json(eventoDetalhe({ souColaborador: true }))),
      http.post(rota('/eventos/e-1/inscricoes'), () => {
        inscreveu = true
        return HttpResponse.json({ id: 'i-9', status: 'CONFIRMADA', codigoCheckin: 'ABCDEF123456', pagamento: null }, { status: 201 })
      }),
      http.get(rota('/inscricoes/minhas'), () => HttpResponse.json([])),
    )
    const usuario = userEvent.setup()
    renderizarApp('/eventos/e-1')

    expect(await screen.findByRole('link', { name: 'Gerenciar evento' })).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Inscrever-se gratuitamente' }))
    await waitFor(() => expect(inscreveu).toBe(true))
  })

  it('organizador continua sem botão de inscrição', async () => {
    const { handlers } = sessaoRestauravel()
    servidor.use(...handlers, http.get(rota('/eventos/e-1'), () => HttpResponse.json(eventoDetalhe({ souOrganizador: true }))))
    renderizarApp('/eventos/e-1')

    expect(await screen.findByRole('link', { name: 'Gerenciar evento' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Inscrever-se/ })).not.toBeInTheDocument()
  })
})

describe('início do evento no futuro (RN05, D53)', () => {
  it('CTW35 — rascunho com início no passado é barrado no formulário', async () => {
    const { handlers } = sessaoRestauravel()
    let chamou = false
    servidor.use(
      ...handlers,
      http.post(rota('/eventos'), () => {
        chamou = true
        return HttpResponse.json({}, { status: 201 })
      }),
    )
    const usuario = userEvent.setup()
    renderizarApp('/meus-eventos/novo')

    await usuario.type(await screen.findByLabelText('Título do evento'), 'Semana Acadêmica')
    await usuario.type(screen.getByLabelText('Descrição'), 'Descrição do evento')
    await usuario.selectOptions(screen.getByLabelText('Categoria'), 'Palestra')
    await usuario.type(screen.getByLabelText('Local'), 'Auditório')
    fireEvent.change(screen.getByLabelText('Início do evento'), { target: { value: '2020-11-12T19:00' } })
    fireEvent.change(screen.getByLabelText('Término do evento'), { target: { value: '2020-11-12T22:00' } })
    fireEvent.change(screen.getByLabelText('Inscrições abrem em'), { target: { value: '2020-10-01T08:00' } })
    fireEvent.change(screen.getByLabelText('Inscrições encerram em'), { target: { value: '2020-11-12T18:00' } })
    await usuario.type(screen.getByLabelText('Preço'), '0')
    await usuario.click(screen.getByRole('button', { name: 'Salvar rascunho' }))

    expect(await screen.findByText('A data e a hora de início precisam ser posteriores ao momento atual.')).toBeInTheDocument()
    expect(chamou).toBe(false)
  })

  it('o erro DATA_INICIO_PASSADA da API vai para o campo de início', async () => {
    const { handlers } = sessaoRestauravel()
    servidor.use(...handlers, http.post(rota('/eventos'), () => problema(422, 'DATA_INICIO_PASSADA', 'A data e a hora de início precisam ser posteriores ao momento atual.')))
    const usuario = userEvent.setup()
    renderizarApp('/meus-eventos/novo')

    await usuario.type(await screen.findByLabelText('Título do evento'), 'Semana Acadêmica')
    await usuario.type(screen.getByLabelText('Descrição'), 'Descrição do evento')
    await usuario.selectOptions(screen.getByLabelText('Categoria'), 'Palestra')
    await usuario.type(screen.getByLabelText('Local'), 'Auditório')
    fireEvent.change(screen.getByLabelText('Início do evento'), { target: { value: '2099-11-12T19:00' } })
    fireEvent.change(screen.getByLabelText('Término do evento'), { target: { value: '2099-11-12T22:00' } })
    fireEvent.change(screen.getByLabelText('Inscrições abrem em'), { target: { value: '2099-10-01T08:00' } })
    fireEvent.change(screen.getByLabelText('Inscrições encerram em'), { target: { value: '2099-11-12T18:00' } })
    await usuario.type(screen.getByLabelText('Preço'), '0')
    await usuario.click(screen.getByRole('button', { name: 'Salvar rascunho' }))

    await waitFor(() => expect(screen.getByLabelText('Início do evento')).toHaveAttribute('aria-invalid', 'true'))
  })
})

// jsdom não tem câmera: definimos só navigator.mediaDevices (trocar o navigator inteiro quebra o jsdom).
const definirCamera = (valor: unknown) => Object.defineProperty(navigator, 'mediaDevices', { value: valor, configurable: true })

describe('check-in por QR code', () => {
  afterEach(() => {
    definirCamera(undefined)
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('CTW36 — o participante vê o QR code do check-in no comprovante', async () => {
    const { handlers } = sessaoRestauravel()
    servidor.use(...handlers, http.get(rota('/inscricoes/minhas'), () => HttpResponse.json([inscricaoExemplo()])))
    const usuario = userEvent.setup()
    renderizarApp('/minhas-inscricoes')

    await usuario.click(await screen.findByRole('button', { name: 'Mostrar QR code' }))
    const qr = await screen.findByRole('img', { name: 'QR code do check-in: VT2026AB1201' })
    expect(qr.getAttribute('src')).toMatch(/^data:image\/svg\+xml/)
  })

  it('CTW37 — o leitor lê o QR pela câmera e registra a presença', { timeout: 15000 }, async () => {
    const parar = vi.fn()
    definirCamera({ getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop: parar }] }) })
    vi.stubGlobal(
      'BarcodeDetector',
      class {
        static getSupportedFormats = async () => ['qr_code']
        detect = async () => [{ rawValue: 'vt2026ab1201' }]
      },
    )
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
    vi.spyOn(HTMLMediaElement.prototype, 'readyState', 'get').mockReturnValue(4)
    const { handlers } = sessaoRestauravel()
    const codigos: string[] = []
    servidor.use(
      ...handlers,
      ...gestao(),
      http.post(rota('/eventos/e-1/checkin'), async ({ request }) => {
        codigos.push(((await request.json()) as { codigoCheckin: string }).codigoCheckin)
        return HttpResponse.json({ nome: 'Beatriz Lima', checkinEm: '2099-11-12T22:05:00Z' })
      }),
    )
    const usuario = userEvent.setup()
    renderizarApp('/meus-eventos/e-1')

    await usuario.click(await screen.findByRole('tab', { name: 'Check-in' }))
    await usuario.click(screen.getByRole('button', { name: 'Ler QR code' }))

    expect(await screen.findByText(/Presença de Beatriz Lima confirmada/)).toBeInTheDocument()
    // A câmera continua vendo o mesmo QR por mais tempo que a janela de ausência (3 s): não registra de novo
    // e a mensagem de sucesso continua na tela.
    await new Promise((r) => setTimeout(r, 3500))
    expect(codigos).toEqual(['VT2026AB1201'])
    expect(screen.getByText(/Presença de Beatriz Lima confirmada/)).toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: 'Fechar câmera' }))
    await waitFor(() => expect(parar).toHaveBeenCalled())
  })

  it('sem câmera, o leitor explica e o código digitado continua disponível', async () => {
    definirCamera(undefined)
    const { handlers } = sessaoRestauravel()
    servidor.use(...handlers, ...gestao())
    const usuario = userEvent.setup()
    renderizarApp('/meus-eventos/e-1')

    await usuario.click(await screen.findByRole('tab', { name: 'Check-in' }))
    await usuario.click(screen.getByRole('button', { name: 'Ler QR code' }))

    expect(await screen.findByText(/Não encontramos uma câmera neste aparelho/)).toBeInTheDocument()
    expect(screen.getByLabelText('Código de check-in')).toBeInTheDocument()
  })
})
