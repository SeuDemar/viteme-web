import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { EventoMeu } from '../api/tipos'
import { eventoDetalhe, eventoResumo, inscricaoExemplo, perfilExemplo, problema, rota, sessaoRestauravel, visitante } from './api'
import { renderizarApp } from './render'
import { servidor } from './servidor'

const pagina = (itens: unknown[]) => HttpResponse.json({ itens, pagina: 1, tamanhoPagina: 12, total: itens.length })

const eventoMeu = (parcial: Partial<EventoMeu> = {}): EventoMeu => ({
  id: 'e-1',
  titulo: 'Semana Acadêmica de Tecnologia',
  categoria: 'Palestra',
  local: 'Auditório principal',
  dataInicio: '2099-11-12T22:00:00Z',
  dataFim: '2099-11-13T01:00:00Z',
  preco: 0,
  status: 'PUBLICADO',
  papel: 'ORGANIZADOR',
  imagemUrl: null,
  ...parcial,
})

afterEach(() => vi.restoreAllMocks())

describe('mural e meus eventos (campos novos da API)', () => {
  it('card mostra "Inscrições encerradas" quando a API informa inscricoesAbertas = false', async () => {
    servidor.use(
      visitante(),
      http.get(rota('/eventos'), () =>
        pagina([
          eventoResumo({ id: 'e-1', titulo: 'Aberto', inscricoesAbertas: true }),
          eventoResumo({ id: 'e-2', titulo: 'Fechado', inscricoesAbertas: false, vagasRestantes: 3 }),
          eventoResumo({ id: 'e-3', titulo: 'Sem o campo' }),
        ]),
      ),
    )
    renderizarApp('/')

    const card = (titulo: string) => screen.getByRole('heading', { name: titulo }).closest('a')!
    await screen.findByRole('heading', { name: 'Fechado' })
    expect(within(card('Aberto')).getByText('Inscrições abertas')).toBeInTheDocument()
    expect(within(card('Fechado')).getByText('Inscrições encerradas')).toBeInTheDocument()
    expect(within(card('Fechado')).queryByText('3 vagas')).not.toBeInTheDocument()
    expect(within(card('Sem o campo')).getByText('Inscrições abertas')).toBeInTheDocument()
  })

  it('Meus eventos mostra inscritos e vagas restantes', async () => {
    const { handlers } = sessaoRestauravel()
    servidor.use(
      http.get(rota('/eventos/meus'), () =>
        HttpResponse.json([
          eventoMeu({ id: 'e-1', titulo: 'Com capacidade', capacidade: 120, inscritos: 96 }),
          eventoMeu({ id: 'e-2', titulo: 'Ilimitado', capacidade: null, inscritos: 1 }),
          eventoMeu({ id: 'e-3', titulo: 'Rascunho', status: 'RASCUNHO', capacidade: 50, inscritos: 0 }),
        ]),
      ),
      ...handlers,
    )
    renderizarApp('/meus-eventos')

    expect(await screen.findByText('96 inscritos • 24 vagas')).toBeInTheDocument()
    expect(screen.getByText('1 inscrito')).toBeInTheDocument()
    expect(screen.queryByText(/0 inscritos/)).not.toBeInTheDocument()
  })
})

describe('certificado nas minhas inscrições', () => {
  it('CTW11 — com certificado disponível, baixa o PDF; sem, não mostra o botão', async () => {
    const { handlers } = sessaoRestauravel()
    const criarUrl = vi.fn(() => 'blob:certificado')
    Object.assign(URL, { createObjectURL: criarUrl, revokeObjectURL: vi.fn() })
    const clique = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    servidor.use(
      http.get(rota('/inscricoes/minhas'), ({ request }) =>
        HttpResponse.json(
          new URL(request.url).searchParams.get('situacao') === 'passadas'
            ? [
                inscricaoExemplo({ id: 'i-1', evento: { id: 'e-1', titulo: 'Com presença', dataInicio: '2020-01-01T22:00:00Z', local: 'Auditório' }, presencaConfirmada: true, certificadoDisponivel: true }),
                inscricaoExemplo({ id: 'i-2', evento: { id: 'e-2', titulo: 'Sem presença', dataInicio: '2020-01-02T22:00:00Z', local: 'Auditório' } }),
              ]
            : [],
        ),
      ),
      http.get(rota('/inscricoes/i-1/certificado'), () => new HttpResponse('%PDF-1.4', { headers: { 'Content-Type': 'application/pdf' } })),
      ...handlers,
    )
    const usuario = userEvent.setup()
    renderizarApp('/minhas-inscricoes')

    await usuario.click(await screen.findByRole('tab', { name: 'Anteriores' }))
    const botoes = await screen.findAllByRole('button', { name: 'Baixar certificado' })
    expect(botoes).toHaveLength(1)
    expect(within(screen.getByRole('heading', { name: 'Sem presença' }).closest('article')!).queryByRole('button', { name: 'Baixar certificado' })).not.toBeInTheDocument()

    await usuario.click(botoes[0])
    await waitFor(() => expect(clique).toHaveBeenCalled())
    expect(criarUrl).toHaveBeenCalled()
    expect((clique.mock.contexts[0] as HTMLAnchorElement).download).toBe('certificado-com-presenca.pdf')
  })

  it('CTW11 — erro ao gerar o certificado aparece no item', async () => {
    const { handlers } = sessaoRestauravel()
    servidor.use(
      http.get(rota('/inscricoes/minhas'), () => HttpResponse.json([inscricaoExemplo({ certificadoDisponivel: true, presencaConfirmada: true })])),
      http.get(rota('/inscricoes/i-1/certificado'), () => problema(422, 'CERTIFICADO_INDISPONIVEL', 'O certificado ainda não está disponível.')),
      ...handlers,
    )
    const usuario = userEvent.setup()
    renderizarApp('/minhas-inscricoes')

    await usuario.click(await screen.findByRole('button', { name: 'Baixar certificado' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('O certificado ainda não está disponível.')
    expect(screen.getByRole('button', { name: 'Baixar certificado' })).toBeEnabled()
  })
})

describe('verificação do telefone', () => {
  it('CTW14 — envia o código, bloqueia o reenvio por 60 s e confirma', async () => {
    const { handlers } = sessaoRestauravel()
    let verificado = false
    let codigoEnviado: string | null = null
    servidor.use(
      http.get(rota('/usuarios/me'), () => HttpResponse.json({ ...perfilExemplo, telefoneVerificado: verificado })),
      http.post(rota('/usuarios/me/telefone/codigo'), () => HttpResponse.json({ expiraEm: '2099-01-01T00:10:00Z' })),
      http.post(rota('/usuarios/me/telefone/verificar'), async ({ request }) => {
        codigoEnviado = ((await request.json()) as { codigo: string }).codigo
        verificado = true
        return HttpResponse.json({ telefoneVerificado: true })
      }),
      ...handlers,
    )
    const usuario = userEvent.setup()
    renderizarApp('/perfil')

    await usuario.click(await screen.findByRole('button', { name: 'Enviar código' }))
    const reenviar = await screen.findByRole('button', { name: /Reenviar em (59|60)s/ })
    expect(reenviar).toBeDisabled()

    await usuario.type(screen.getByLabelText('Código recebido'), '123456')
    await usuario.click(screen.getByRole('button', { name: 'Confirmar código' }))

    expect(await screen.findByText('Telefone verificado')).toBeInTheDocument()
    expect(codigoEnviado).toBe('123456')
    expect(screen.getByRole('button', { name: 'Ativar avisos por SMS' })).toBeEnabled()
    expect(screen.queryByRole('region', { name: 'Verificação do telefone' })).not.toBeInTheDocument()
  })

  it('CTW14 — código errado aparece no campo e "aguarde" (429) inicia o contador', async () => {
    const { handlers } = sessaoRestauravel()
    servidor.use(
      http.get(rota('/usuarios/me'), () => HttpResponse.json({ ...perfilExemplo, telefoneVerificado: false })),
      http.post(rota('/usuarios/me/telefone/codigo'), () => problema(429, 'AGUARDE_NOVO_CODIGO', 'Aguarde 60 segundos para pedir um novo código.')),
      http.post(rota('/usuarios/me/telefone/verificar'), () => problema(400, 'VALIDACAO', 'Dados inválidos.', { errors: { codigo: ['Código inválido ou expirado.'] } })),
      ...handlers,
    )
    const usuario = userEvent.setup()
    renderizarApp('/perfil')

    await usuario.click(await screen.findByRole('button', { name: 'Enviar código' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Aguarde 60 segundos')
    expect(screen.getByRole('button', { name: /Reenviar em/ })).toBeDisabled()

    await usuario.type(screen.getByLabelText('Código recebido'), '000000')
    await usuario.click(screen.getByRole('button', { name: 'Confirmar código' }))
    expect(await screen.findByText('Código inválido ou expirado.')).toBeInTheDocument()
  })
})

describe('cancelar evento e denunciar', () => {
  it('CTW20 — cancelar evento exige motivo e chama a API', async () => {
    const { handlers } = sessaoRestauravel()
    let cancelado = false
    let corpo: unknown = null
    servidor.use(
      http.get(rota('/eventos/e-1'), () => HttpResponse.json(eventoDetalhe({ souOrganizador: true, status: cancelado ? 'CANCELADO' : 'PUBLICADO' }))),
      http.get(rota('/eventos/e-1/inscricoes'), () => HttpResponse.json({ itens: [], pagina: 1, tamanhoPagina: 20, total: 0 })),
      http.post(rota('/eventos/e-1/cancelar'), async ({ request }) => {
        corpo = await request.json()
        cancelado = true
        return HttpResponse.json({ status: 'CANCELADO' })
      }),
      ...handlers,
    )
    const usuario = userEvent.setup()
    renderizarApp('/meus-eventos/e-1')

    await usuario.click(await screen.findByRole('button', { name: 'Cancelar evento' }))
    const dialogo = screen.getByRole('dialog', { name: 'Cancelar evento' })
    await usuario.type(within(dialogo).getByLabelText('Motivo do cancelamento'), 'curto')
    await usuario.click(within(dialogo).getByRole('button', { name: 'Confirmar cancelamento' }))
    expect(await within(dialogo).findByText(/10/)).toBeInTheDocument()
    expect(corpo).toBeNull()

    await usuario.type(within(dialogo).getByLabelText('Motivo do cancelamento'), ' demais: palestrante adoeceu')
    await usuario.click(within(dialogo).getByRole('button', { name: 'Confirmar cancelamento' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(corpo).toEqual({ motivo: 'curto demais: palestrante adoeceu' })
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Cancelar evento' })).not.toBeInTheDocument())
  })

  it('CTW21 — denúncia exige motivo, descrição quando "Outro" e informa denúncia repetida', async () => {
    const { handlers } = sessaoRestauravel()
    const corpos: unknown[] = []
    servidor.use(
      http.get(rota('/eventos/e-1'), () => HttpResponse.json(eventoDetalhe())),
      http.post(rota('/eventos/e-1/denuncias'), async ({ request }) => {
        corpos.push(await request.json())
        return corpos.length === 1 ? new HttpResponse(null, { status: 201 }) : problema(409, 'DENUNCIA_JA_REGISTRADA', 'Você já denunciou este evento.')
      }),
      ...handlers,
    )
    const usuario = userEvent.setup()
    renderizarApp('/eventos/e-1')

    await usuario.click(await screen.findByRole('button', { name: 'Denunciar este evento' }))
    let dialogo = screen.getByRole('dialog', { name: 'Denunciar evento' })
    await usuario.click(within(dialogo).getByRole('button', { name: 'Enviar denúncia' }))
    expect(corpos).toHaveLength(0)

    await usuario.selectOptions(within(dialogo).getByLabelText('Motivo'), 'OUTRO')
    await usuario.click(within(dialogo).getByRole('button', { name: 'Enviar denúncia' }))
    expect(corpos).toHaveLength(0)
    expect(within(dialogo).getByLabelText('Descrição')).toHaveAttribute('aria-invalid', 'true')

    await usuario.type(within(dialogo).getByLabelText('Descrição'), 'O local informado não existe.')
    await usuario.click(within(dialogo).getByRole('button', { name: 'Enviar denúncia' }))
    expect(await within(dialogo).findByText(/Denúncia enviada/)).toBeInTheDocument()
    expect(corpos[0]).toEqual({ motivo: 'OUTRO', descricao: 'O local informado não existe.' })
    await usuario.click(within(dialogo).getByRole('button', { name: 'Fechar' }))

    await usuario.click(screen.getByRole('button', { name: 'Denunciar este evento' }))
    dialogo = screen.getByRole('dialog', { name: 'Denunciar evento' })
    await usuario.selectOptions(within(dialogo).getByLabelText('Motivo'), 'SPAM')
    await usuario.click(within(dialogo).getByRole('button', { name: 'Enviar denúncia' }))
    expect(await within(dialogo).findByRole('alert')).toHaveTextContent('Você já denunciou este evento.')
  })
})

describe('erros e estados de tela', () => {
  it('CTW24 — erro 500 no mural mostra a mensagem e "Tentar novamente" recarrega', async () => {
    let chamadas = 0
    servidor.use(
      visitante(),
      http.get(rota('/eventos'), () => {
        chamadas += 1
        return chamadas === 1 ? problema(500, 'ERRO_INTERNO', 'Erro interno.') : pagina([eventoResumo()])
      }),
    )
    const usuario = userEvent.setup()
    renderizarApp('/')

    expect(await screen.findByRole('alert')).toHaveTextContent('Algo deu errado do nosso lado.')
    await usuario.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(await screen.findByRole('heading', { name: 'Semana Acadêmica de Tecnologia' })).toBeInTheDocument()
  })

  it('CTW24 — falha de rede mostra a mensagem de conexão', async () => {
    servidor.use(visitante(), http.get(rota('/eventos'), () => HttpResponse.error()))
    renderizarApp('/')

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível conectar.')
  })

  it('CTW24 — 429 no login mostra o detalhe da API', async () => {
    servidor.use(visitante(), http.post(rota('/auth/login'), () => problema(429, 'LIMITE_EXCEDIDO', 'Muitas tentativas de login. Tente em 1 minuto.')))
    const usuario = userEvent.setup()
    renderizarApp('/entrar')

    await usuario.type(await screen.findByLabelText('E-mail'), 'maria@exemplo.com')
    await usuario.type(screen.getByLabelText('Senha'), 'Senha123')
    await usuario.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Muitas tentativas de login. Tente em 1 minuto.')
  })

  it('CTW25 — mostra "Carregando" e depois o estado vazio', async () => {
    servidor.use(
      visitante(),
      http.get(rota('/eventos'), async () => {
        await delay(50)
        return pagina([])
      }),
    )
    renderizarApp('/')

    expect(await screen.findByRole('status', { name: 'Carregando' })).toBeInTheDocument()
    expect(await screen.findByText('Ainda não há eventos publicados')).toBeInTheDocument()
    expect(screen.queryByRole('status', { name: 'Carregando' })).not.toBeInTheDocument()
  })

  it('CTW25 — Minhas inscrições vazia oferece explorar eventos', async () => {
    const { handlers } = sessaoRestauravel()
    servidor.use(http.get(rota('/inscricoes/minhas'), () => HttpResponse.json([])), ...handlers)
    renderizarApp('/minhas-inscricoes')

    expect(await screen.findByText('Você não tem inscrições próximas')).toBeInTheDocument()
    expect(within(screen.getByRole('main')).getByRole('link', { name: 'Explorar eventos' })).toBeInTheDocument()
  })
})

describe('falha inesperada na tela', () => {
  it('o limite de erro mostra uma mensagem em vez da página em branco', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { render } = await import('@testing-library/react')
    const { LimiteDeErro } = await import('../components/LimiteDeErro')
    const Explode = () => {
      throw new Error('falhou')
    }
    render(
      <LimiteDeErro>
        <Explode />
      </LimiteDeErro>,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível abrir esta tela')
    expect(screen.getByRole('button', { name: 'Recarregar a página' })).toBeInTheDocument()
  })
})
