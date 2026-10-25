import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { eventoResumo, inscricaoExemplo, perfilExemplo, problema, rota, sessaoRestauravel, visitante } from './api'
import { renderizarApp } from './render'
import { servidor } from './servidor'

/** Casos CT58–CT63 do plano de testes (Quadro 80 da especificação). */
describe('CT58 — validação do formulário de cadastro', () => {
  it('mostra mensagens nos campos e não envia a requisição', async () => {
    const cadastro = vi.fn()
    servidor.use(visitante(), http.post(rota('/auth/cadastro'), () => (cadastro(), HttpResponse.json({}, { status: 201 }))))
    const usuario = userEvent.setup()
    renderizarApp('/cadastro')

    await usuario.type(await screen.findByLabelText('Nome completo'), 'Maria Oliveira')
    await usuario.type(screen.getByLabelText('E-mail'), 'email-invalido')
    await usuario.type(screen.getByLabelText('Senha'), 'abcdefgh')
    await usuario.type(screen.getByLabelText('Confirmar senha'), 'abcdefgh')
    await usuario.click(screen.getByRole('button', { name: 'Criar conta' }))

    expect(await screen.findByText('Informe um e-mail válido.')).toBeInTheDocument()
    expect(screen.getByText('A senha deve ter pelo menos um número.')).toBeInTheDocument()
    expect(cadastro).not.toHaveBeenCalled()
  })
})

describe('CT59 — rota protegida', () => {
  it('redireciona o visitante ao login e volta à rota após autenticar', async () => {
    servidor.use(
      visitante(),
      http.post(rota('/auth/login'), () => HttpResponse.json({ tokenAcesso: 'tok-login', expiraEm: '2099-01-01T00:00:00Z', usuario: { id: 'u-1', nome: 'Maria Oliveira', email: 'maria@exemplo.com', telefoneVerificado: true, aceitaSms: false } })),
      http.get(rota('/inscricoes/minhas'), () => HttpResponse.json([inscricaoExemplo()])),
      http.get(rota('/notificacoes'), () => HttpResponse.json({ itens: [], naoLidas: 0, pagina: 1, total: 0 })),
    )
    const usuario = userEvent.setup()
    renderizarApp('/minhas-inscricoes')

    expect(await screen.findByRole('heading', { name: 'Entrar na sua conta' })).toBeInTheDocument()
    await usuario.type(screen.getByLabelText('E-mail'), 'maria@exemplo.com')
    await usuario.type(screen.getByLabelText('Senha'), 'Senha123')
    await usuario.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByRole('heading', { name: 'Minhas inscrições' })).toBeInTheDocument()
    expect(screen.getByTestId('local')).toHaveTextContent('/minhas-inscricoes')
    expect(await screen.findByText('VT2026AB1201')).toBeInTheDocument()
  })
})

describe('CT60 — renovação automática do token', () => {
  it('renova o token expirado e repete a requisição sem perder a ação', async () => {
    const { chamadas, handlers } = sessaoRestauravel(['tok-1', 'tok-2'])
    const usados: (string | null)[] = []
    servidor.use(
      ...handlers,
      http.get(rota('/inscricoes/minhas'), ({ request }) => {
        const autorizacao = request.headers.get('authorization')
        usados.push(autorizacao)
        return autorizacao === 'Bearer tok-2' ? HttpResponse.json([inscricaoExemplo()]) : problema(401, 'TOKEN_INVALIDO', 'Token expirado.')
      }),
    )
    renderizarApp('/minhas-inscricoes')

    expect(await screen.findByText('VT2026AB1201')).toBeInTheDocument()
    expect(chamadas.renovar).toBe(2) // restauração da sessão + renovação após o 401
    expect(usados).toEqual(['Bearer tok-1', 'Bearer tok-2'])
  })

  it('leva ao login quando a renovação falha', async () => {
    const { handlers } = sessaoRestauravel()
    let renovacoes = 0
    // Handlers mais específicos primeiro: o MSW usa o primeiro que casar com a requisição.
    servidor.use(
      http.post(rota('/auth/renovar'), () => (renovacoes++ === 0 ? HttpResponse.json({ tokenAcesso: 'tok-1', expiraEm: '2099-01-01T00:00:00Z' }) : problema(401, 'TOKEN_INVALIDO', 'Token inválido.'))),
      http.get(rota('/inscricoes/minhas'), () => problema(401, 'TOKEN_INVALIDO', 'Token expirado.')),
      ...handlers,
    )
    renderizarApp('/minhas-inscricoes')

    expect(await screen.findByRole('heading', { name: 'Entrar na sua conta' })).toBeInTheDocument()
  })
})

describe('CT61 — erros da API nos campos', () => {
  it('mostra os erros 400 nos campos correspondentes', async () => {
    const { handlers } = sessaoRestauravel()
    servidor.use(
      ...handlers,
      http.post(rota('/eventos'), () =>
        problema(400, 'DADOS_INVALIDOS', 'Um ou mais campos estão inválidos.', { errors: { titulo: ['Já existe um evento com este título.'], local: ['O local informado é inválido.'] } }),
      ),
    )
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

    expect(await screen.findByText('Já existe um evento com este título.')).toBeInTheDocument()
    expect(screen.getByText('O local informado é inválido.')).toBeInTheDocument()
    expect(screen.getByLabelText('Título do evento')).toHaveAttribute('aria-invalid', 'true')
  })
})

describe('CT62 — destaque de alteração no mural', () => {
  it('exibe o selo "Alterado" no card do evento alterado nas últimas 72 horas', async () => {
    servidor.use(
      visitante(),
      http.get(rota('/eventos'), () =>
        HttpResponse.json({
          itens: [eventoResumo({ id: 'e-1', titulo: 'Workshop de Inteligência Artificial', alteradoRecentemente: true, preco: 25 }), eventoResumo({ id: 'e-2', titulo: 'Palestra: Mercado de Trabalho' })],
          pagina: 1,
          tamanhoPagina: 12,
          total: 2,
        }),
      ),
    )
    renderizarApp('/')

    const alterado = (await screen.findByText('Workshop de Inteligência Artificial')).closest('a')!
    expect(within(alterado).getByText('Alterado')).toBeInTheDocument()
    expect(within(alterado).getByText(/R\$\s?25,00/)).toBeInTheDocument()
    const outro = screen.getByText('Palestra: Mercado de Trabalho').closest('a')!
    expect(within(outro).queryByText('Alterado')).not.toBeInTheDocument()
  })
})

describe('CT63 — recarregar a página logado', () => {
  it('chama E03 ao iniciar e restaura a sessão sem novo login', async () => {
    const { chamadas, handlers } = sessaoRestauravel()
    servidor.use(...handlers, http.get(rota('/eventos'), () => HttpResponse.json({ itens: [], pagina: 1, tamanhoPagina: 12, total: 0 })))
    renderizarApp('/')

    expect(await screen.findByText(perfilExemplo.nome)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sair' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Entrar' })).not.toBeInTheDocument()
    expect(chamadas.renovar).toBe(1)
  })

  it('envia o cabeçalho X-Requested-With exigido pela API em /auth/renovar', async () => {
    const { chamadas, handlers } = sessaoRestauravel()
    servidor.use(...handlers, http.get(rota('/eventos'), () => HttpResponse.json({ itens: [], pagina: 1, tamanhoPagina: 12, total: 0 })))
    renderizarApp('/')

    await screen.findByText(perfilExemplo.nome)
    await waitFor(() => expect(chamadas.cabecalhos).toEqual(['viteme-web']))
  })
})
