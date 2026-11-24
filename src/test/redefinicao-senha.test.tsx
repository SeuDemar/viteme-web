import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { problema, rota, visitante } from './api'
import { renderizarApp } from './render'
import { servidor } from './servidor'

describe('redefinição de senha', () => {
  it('o login leva à tela "Esqueci minha senha"', async () => {
    servidor.use(visitante())
    const usuario = userEvent.setup()
    renderizarApp('/entrar')

    await usuario.click(await screen.findByRole('link', { name: 'Esqueci minha senha' }))

    expect(await screen.findByRole('heading', { name: 'Esqueci minha senha' })).toBeInTheDocument()
  })

  it('pedir o link mostra a confirmação neutra, sem dizer se a conta existe', async () => {
    let corpo: unknown
    servidor.use(
      visitante(),
      http.post(rota('/auth/esqueci-senha'), async ({ request }) => {
        corpo = await request.json()
        return new HttpResponse(null, { status: 202 })
      }),
    )
    const usuario = userEvent.setup()
    renderizarApp('/esqueci-senha')

    await usuario.type(await screen.findByLabelText('E-mail'), 'maria@exemplo.com')
    await usuario.click(screen.getByRole('button', { name: 'Enviar link' }))

    expect(await screen.findByText(/Se existe uma conta com/)).toHaveTextContent('maria@exemplo.com')
    expect(corpo).toEqual({ email: 'maria@exemplo.com' })
  })

  it('e-mail inválido é barrado antes de chamar a API', async () => {
    servidor.use(visitante())
    const usuario = userEvent.setup()
    renderizarApp('/esqueci-senha')

    await usuario.type(await screen.findByLabelText('E-mail'), 'isso-nao-e-email')
    await usuario.click(screen.getByRole('button', { name: 'Enviar link' }))

    expect(await screen.findByText('Informe um e-mail válido.')).toBeInTheDocument()
  })

  it('redefinir envia o token do link e a nova senha e leva ao login', async () => {
    let corpo: unknown
    servidor.use(
      visitante(),
      http.post(rota('/auth/redefinir-senha'), async ({ request }) => {
        corpo = await request.json()
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const usuario = userEvent.setup()
    renderizarApp('/redefinir-senha?token=abc123')

    await usuario.type(await screen.findByLabelText('Nova senha'), 'NovaSenha456')
    await usuario.type(screen.getByLabelText('Confirmar senha'), 'NovaSenha456')
    await usuario.click(screen.getByRole('button', { name: 'Salvar nova senha' }))

    expect(await screen.findByRole('heading', { name: 'Senha alterada' })).toBeInTheDocument()
    expect(within(screen.getByRole('main')).getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/entrar')
    expect(corpo).toEqual({ token: 'abc123', novaSenha: 'NovaSenha456' })
  })

  it('link vencido ou usado mostra o erro da API e oferece pedir outro', async () => {
    servidor.use(
      visitante(),
      http.post(rota('/auth/redefinir-senha'), () =>
        problema(400, 'LINK_REDEFINICAO_INVALIDO', 'O link de redefinição de senha é inválido, já foi usado ou expirou. Peça um novo.'),
      ),
    )
    const usuario = userEvent.setup()
    renderizarApp('/redefinir-senha?token=velho')

    await usuario.type(await screen.findByLabelText('Nova senha'), 'NovaSenha456')
    await usuario.type(screen.getByLabelText('Confirmar senha'), 'NovaSenha456')
    await usuario.click(screen.getByRole('button', { name: 'Salvar nova senha' }))

    expect(await screen.findByText(/inválido, já foi usado ou expirou/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Pedir novo link' })).toHaveAttribute('href', '/esqueci-senha')
  })

  it('senha fraca ou confirmação diferente são barradas no formulário', async () => {
    servidor.use(visitante())
    const usuario = userEvent.setup()
    renderizarApp('/redefinir-senha?token=abc123')

    await usuario.type(await screen.findByLabelText('Nova senha'), 'abcdefgh')
    await usuario.type(screen.getByLabelText('Confirmar senha'), 'outra')
    await usuario.click(screen.getByRole('button', { name: 'Salvar nova senha' }))

    expect(await screen.findByText('A senha deve ter pelo menos um número.')).toBeInTheDocument()
    expect(screen.getByText('A confirmação deve ser igual à senha.')).toBeInTheDocument()
  })

  it('sem token na URL a tela avisa que o link está incompleto', async () => {
    servidor.use(visitante())
    renderizarApp('/redefinir-senha')

    expect(await screen.findByRole('heading', { name: 'Link inválido' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Pedir novo link' })).toBeInTheDocument()
  })
})
