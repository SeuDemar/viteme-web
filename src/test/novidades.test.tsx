import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { eventoDetalhe, eventoResumo, inscricaoExemplo, perfilExemplo, problema, rota, sessaoRestauravel, visitante } from './api'
import { definirDataHora, escolherOpcao } from './interacao'
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

describe('cache do mural', () => {
  const lista = (itens: ReturnType<typeof eventoResumo>[]) => HttpResponse.json({ itens, pagina: 1, tamanhoPagina: 12, total: itens.length })
  const A = [eventoResumo({ id: 'a1', titulo: 'Evento A1' }), eventoResumo({ id: 'a2', titulo: 'Evento A2' })]
  const B = [eventoResumo({ id: 'b1', titulo: 'Só palestra', categoria: 'Palestra' })]

  it('CTW37 — ao trocar de filtro a lista anterior fica (esmaecida) até a nova chegar, sem voltar ao esqueleto', async () => {
    servidor.use(
      visitante(),
      http.get(rota('/eventos'), async ({ request }) => {
        if (new URL(request.url).searchParams.get('categoria') === 'Palestra') {
          await delay(250)
          return lista(B)
        }
        return lista(A)
      }),
    )
    const usuario = userEvent.setup()
    renderizarApp('/')
    expect(await screen.findByText('Evento A1')).toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: 'Palestras' }))
    expect(screen.getByText('Evento A1')).toBeInTheDocument()
    expect(screen.queryByRole('status', { name: 'Carregando' })).not.toBeInTheDocument()
    expect(document.querySelector('.mural__resultados')).toHaveAttribute('aria-busy', 'true')

    expect(await screen.findByText('Só palestra')).toBeInTheDocument()
    expect(screen.queryByText('Evento A1')).not.toBeInTheDocument()
    expect(document.querySelector('.mural__resultados')).toHaveAttribute('aria-busy', 'false')
  })

  it('CTW38 — voltar a um filtro já visto usa o cache e não pede à API de novo', async () => {
    const pedidos: (string | null)[] = []
    servidor.use(
      visitante(),
      http.get(rota('/eventos'), ({ request }) => {
        const categoria = new URL(request.url).searchParams.get('categoria')
        pedidos.push(categoria)
        return categoria === 'Palestra' ? lista(B) : lista(A)
      }),
    )
    const usuario = userEvent.setup()
    renderizarApp('/')
    await screen.findByText('Evento A1')
    await usuario.click(screen.getByRole('button', { name: 'Palestras' }))
    await screen.findByText('Só palestra')
    await usuario.click(screen.getByRole('button', { name: 'Todos' }))
    expect(await screen.findByText('Evento A1')).toBeInTheDocument()

    expect(pedidos).toEqual([null, 'Palestra'])
  })

  it('CTW39 — passar o mouse num card já busca o detalhe do evento (abre na hora ao clicar)', async () => {
    let detalhes = 0
    servidor.use(
      visitante(),
      http.get(rota('/eventos'), () => lista(A)),
      http.get(rota('/eventos/a1'), () => {
        detalhes += 1
        return HttpResponse.json(eventoDetalhe({ id: 'a1', titulo: 'Evento A1' }))
      }),
    )
    const usuario = userEvent.setup()
    renderizarApp('/')
    await usuario.hover(await screen.findByRole('link', { name: /Evento A1/ }))
    await waitFor(() => expect(detalhes).toBe(1))
  })
})

describe('menu por sessão', () => {
  const semEventos = http.get(rota('/eventos'), () => HttpResponse.json({ itens: [], pagina: 1, tamanhoPagina: 12, total: 0 }))

  it('CTW34 — visitante não vê nada de "meu" (eventos, inscrições, perfil) no menu nem na barra de abas', async () => {
    servidor.use(visitante(), semEventos)
    renderizarApp('/')

    expect(await screen.findByRole('link', { name: 'Entrar' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Explorar eventos' })).toBeInTheDocument()
    for (const nome of ['Meus eventos', 'Eventos', 'Minhas inscrições', 'Inscrições', 'Perfil']) {
      expect(screen.queryByRole('link', { name: nome })).not.toBeInTheDocument()
    }
    expect(screen.getByRole('link', { name: 'Acessar' })).toHaveAttribute('href', '/entrar')
  })

  it('CTW35 — com a sessão iniciada, aparecem Meus eventos, Minhas inscrições e Perfil (menu e barra de abas)', async () => {
    const { handlers } = sessaoRestauravel()
    servidor.use(...handlers, semEventos)
    renderizarApp('/')

    expect(await screen.findByRole('link', { name: 'Meus eventos' })).toHaveAttribute('href', '/meus-eventos')
    expect(screen.getByRole('link', { name: 'Eventos' })).toHaveAttribute('href', '/meus-eventos')
    expect(screen.getByRole('link', { name: 'Minhas inscrições' })).toHaveAttribute('href', '/minhas-inscricoes')
    expect(screen.getByRole('link', { name: 'Inscrições' })).toHaveAttribute('href', '/minhas-inscricoes')
    expect(screen.getByRole('link', { name: 'Perfil' })).toHaveAttribute('href', '/perfil')
    expect(screen.queryByRole('link', { name: 'Acessar' })).not.toBeInTheDocument()
  })
})

describe('fundo com rolagem', () => {
  it('CTW40 — a variável --rolagem acompanha o quanto a página foi rolada (0 a 1)', async () => {
    servidor.use(visitante(), http.get(rota('/eventos'), () => HttpResponse.json({ itens: [], pagina: 1, tamanhoPagina: 12, total: 0 })))
    const raiz = document.documentElement
    const original = { alt: Object.getOwnPropertyDescriptor(raiz, 'scrollHeight'), y: Object.getOwnPropertyDescriptor(window, 'scrollY') }
    Object.defineProperty(raiz, 'scrollHeight', { configurable: true, value: 2000 })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 1000 })
    let rolagem = 0
    Object.defineProperty(window, 'scrollY', { configurable: true, get: () => rolagem })
    try {
      renderizarApp('/')
      await screen.findByRole('link', { name: 'Entrar' })
      await waitFor(() => expect(raiz.style.getPropertyValue('--rolagem')).toBe('0.0000'))

      rolagem = 500
      fireEvent.scroll(window)
      await waitFor(() => expect(raiz.style.getPropertyValue('--rolagem')).toBe('0.5000'))

      rolagem = 5000
      fireEvent.scroll(window)
      await waitFor(() => expect(raiz.style.getPropertyValue('--rolagem')).toBe('1.0000'))
    } finally {
      if (original.alt) Object.defineProperty(raiz, 'scrollHeight', original.alt)
      else delete (raiz as unknown as Record<string, unknown>).scrollHeight
      if (original.y) Object.defineProperty(window, 'scrollY', original.y)
      else delete (window as unknown as Record<string, unknown>).scrollY
    }
  })
})

describe('tema', () => {
  it('CTW36 — o botão alterna entre tema claro e escuro e guarda a escolha', async () => {
    servidor.use(visitante(), http.get(rota('/eventos'), () => HttpResponse.json({ itens: [], pagina: 1, tamanhoPagina: 12, total: 0 })))
    const usuario = userEvent.setup()
    renderizarApp('/')
    try {
      await usuario.click(await screen.findByRole('button', { name: 'Ativar tema escuro' }))
      expect(document.documentElement.dataset.tema).toBe('escuro')
      expect(localStorage.getItem('viteme:tema')).toBe('escuro')

      await usuario.click(screen.getByRole('button', { name: 'Ativar tema claro' }))
      expect(document.documentElement.dataset.tema).toBe('claro')
      expect(localStorage.getItem('viteme:tema')).toBe('claro')
    } finally {
      localStorage.removeItem('viteme:tema')
      delete document.documentElement.dataset.tema
    }
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
    await escolherOpcao(usuario, screen.getByLabelText('Categoria'), 'Palestra')
    await usuario.type(screen.getByLabelText('Local'), 'Auditório')
    definirDataHora(screen.getByLabelText('Início do evento'), '2020-11-12T19:00')
    definirDataHora(screen.getByLabelText('Término do evento'), '2020-11-12T22:00')
    definirDataHora(screen.getByLabelText('Inscrições abrem em'), '2020-10-01T08:00')
    definirDataHora(screen.getByLabelText('Inscrições encerram em'), '2020-11-12T18:00')
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
    await escolherOpcao(usuario, screen.getByLabelText('Categoria'), 'Palestra')
    await usuario.type(screen.getByLabelText('Local'), 'Auditório')
    definirDataHora(screen.getByLabelText('Início do evento'), '2099-11-12T19:00')
    definirDataHora(screen.getByLabelText('Término do evento'), '2099-11-12T22:00')
    definirDataHora(screen.getByLabelText('Inscrições abrem em'), '2099-10-01T08:00')
    definirDataHora(screen.getByLabelText('Inscrições encerram em'), '2099-11-12T18:00')
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
