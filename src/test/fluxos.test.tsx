import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { eventoDetalhe, eventoResumo, inscricaoExemplo, perfilExemplo, problema, rota, sessaoRestauravel, visitante } from './api'
import { renderizarApp } from './render'
import { servidor } from './servidor'

const listaVazia = http.get(rota('/eventos'), () => HttpResponse.json({ itens: [eventoResumo()], pagina: 1, tamanhoPagina: 12, total: 1 }))

describe('login e cadastro', () => {
  it('CTW01 — credenciais erradas mostram mensagem genérica e reabilitam o botão', async () => {
    servidor.use(visitante(), http.post(rota('/auth/login'), () => problema(401, 'CREDENCIAIS_INVALIDAS', 'E-mail ou senha incorretos.')))
    const usuario = userEvent.setup()
    renderizarApp('/entrar')

    await usuario.type(await screen.findByLabelText('E-mail'), 'maria@exemplo.com')
    await usuario.type(screen.getByLabelText('Senha'), 'errada123')
    await usuario.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha incorretos.')
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeEnabled()
  })

  it('CTW02 — conta bloqueada (423) informa o bloqueio temporário', async () => {
    servidor.use(visitante(), http.post(rota('/auth/login'), () => problema(423, 'CONTA_BLOQUEADA', 'Conta bloqueada por 15 minutos.')))
    const usuario = userEvent.setup()
    renderizarApp('/entrar')

    await usuario.type(await screen.findByLabelText('E-mail'), 'maria@exemplo.com')
    await usuario.type(screen.getByLabelText('Senha'), 'qualquer1')
    await usuario.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Conta bloqueada por 15 minutos.')
  })

  it('CTW03 — e-mail já cadastrado (409) aparece no campo e-mail', async () => {
    servidor.use(visitante(), http.post(rota('/auth/cadastro'), () => problema(409, 'EMAIL_JA_CADASTRADO', 'E-mail já cadastrado.')))
    const usuario = userEvent.setup()
    renderizarApp('/cadastro')

    await usuario.type(await screen.findByLabelText('Nome completo'), 'Maria Oliveira')
    await usuario.type(screen.getByLabelText('E-mail'), 'maria@exemplo.com')
    await usuario.type(screen.getByLabelText('Senha'), 'Senha123')
    await usuario.type(screen.getByLabelText('Confirmar senha'), 'Senha123')
    await usuario.click(screen.getByRole('button', { name: 'Criar conta' }))

    expect(await screen.findByText('Este e-mail já está cadastrado.')).toBeInTheDocument()
  })

  it('cadastro válido envia o telefone em E.164 e entra automaticamente', async () => {
    let corpo: Record<string, unknown> | null = null
    servidor.use(
      visitante(),
      http.post(rota('/auth/cadastro'), async ({ request }) => {
        corpo = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ id: 'u-1', nome: 'Maria Oliveira', email: 'maria@exemplo.com' }, { status: 201 })
      }),
      http.post(rota('/auth/login'), () => HttpResponse.json({ tokenAcesso: 'tok', expiraEm: '2099-01-01T00:00:00Z', usuario: { id: 'u-1', nome: 'Maria Oliveira', email: 'maria@exemplo.com', telefoneVerificado: false, aceitaSms: false } })),
      listaVazia,
      http.get(rota('/notificacoes'), () => HttpResponse.json({ itens: [], naoLidas: 0, pagina: 1, total: 0 })),
    )
    const usuario = userEvent.setup()
    renderizarApp('/cadastro')

    await usuario.type(await screen.findByLabelText('Nome completo'), 'Maria Oliveira')
    await usuario.type(screen.getByLabelText('E-mail'), 'maria@exemplo.com')
    await usuario.type(screen.getByLabelText('Senha'), 'Senha123')
    await usuario.type(screen.getByLabelText('Confirmar senha'), 'Senha123')
    await usuario.type(screen.getByLabelText('Telefone (opcional)'), '44999990000')
    expect(screen.getByLabelText('Telefone (opcional)')).toHaveValue('(44) 99999-0000')
    await usuario.click(screen.getByRole('button', { name: 'Criar conta' }))

    expect(await screen.findByRole('heading', { name: 'Descubra eventos' })).toBeInTheDocument()
    expect(corpo).toMatchObject({ nome: 'Maria Oliveira', email: 'maria@exemplo.com', telefone: '+5544999990000' })
  })
})

describe('inscrição e pagamento', () => {
  it('CTW04 — inscrição gratuita confirma e mostra o código de check-in', async () => {
    const { handlers } = sessaoRestauravel()
    servidor.use(
      http.get(rota('/eventos/e-1'), () => HttpResponse.json(eventoDetalhe(), { headers: { ETag: '"1"' } })),
      http.post(rota('/eventos/e-1/inscricoes'), () => HttpResponse.json({ id: 'i-1', status: 'CONFIRMADA', codigoCheckin: 'VT2026AB1201', reservadaAte: null, pagamento: null }, { status: 201 })),
      http.get(rota('/inscricoes/minhas'), () => HttpResponse.json([inscricaoExemplo()])),
      ...handlers,
    )
    const usuario = userEvent.setup()
    renderizarApp('/eventos/e-1')

    await usuario.click(await screen.findByRole('button', { name: 'Inscrever-se gratuitamente' }))

    expect(await screen.findByRole('heading', { name: 'Minhas inscrições' })).toBeInTheDocument()
    expect(await screen.findByText(/Inscrição confirmada! Seu código de check-in é/)).toHaveTextContent('VT2026AB1201')
  })

  it('CTW05 — visitante é levado ao login e volta ao evento', async () => {
    servidor.use(
      visitante(),
      http.get(rota('/eventos/e-1'), () => HttpResponse.json(eventoDetalhe())),
      http.post(rota('/auth/login'), () => HttpResponse.json({ tokenAcesso: 'tok', expiraEm: '2099-01-01T00:00:00Z', usuario: { id: 'u-1', nome: 'Maria Oliveira', email: 'maria@exemplo.com', telefoneVerificado: true, aceitaSms: false } })),
      http.get(rota('/notificacoes'), () => HttpResponse.json({ itens: [], naoLidas: 0, pagina: 1, total: 0 })),
    )
    const usuario = userEvent.setup()
    renderizarApp('/eventos/e-1')

    await usuario.click(await screen.findByRole('button', { name: 'Entre para se inscrever' }))
    await usuario.type(await screen.findByLabelText('E-mail'), 'maria@exemplo.com')
    await usuario.type(screen.getByLabelText('Senha'), 'Senha123')
    await usuario.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByRole('heading', { name: 'Detalhes do evento' })).toBeInTheDocument()
    expect(screen.getByTestId('local')).toHaveTextContent('/eventos/e-1')
  })

  it('CTW08 — evento lotado desabilita a inscrição e explica o motivo', async () => {
    const { handlers } = sessaoRestauravel()
    servidor.use(http.get(rota('/eventos/e-1'), () => HttpResponse.json(eventoDetalhe({ vagasRestantes: 0 }))), ...handlers)
    renderizarApp('/eventos/e-1')

    expect(await screen.findByText('Evento lotado.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Inscrever-se/ })).toBeDisabled()
  })

  it('CTW09 — organizador não vê o botão de inscrição, e sim a gestão', async () => {
    const { handlers } = sessaoRestauravel()
    servidor.use(http.get(rota('/eventos/e-1'), () => HttpResponse.json(eventoDetalhe({ souOrganizador: true }))), ...handlers)
    renderizarApp('/eventos/e-1')

    expect(await screen.findByRole('link', { name: 'Gerenciar evento' })).toHaveAttribute('href', '/meus-eventos/e-1')
    expect(screen.queryByRole('button', { name: /Inscrever-se/ })).not.toBeInTheDocument()
    expect(screen.queryByText('Denunciar este evento')).not.toBeInTheDocument()
  })

  it('CTW06/CTW07 — inscrição paga vai ao pagamento e o polling leva a Minhas inscrições ao aprovar', async () => {
    const { handlers } = sessaoRestauravel()
    let consultas = 0
    servidor.use(
      http.get(rota('/eventos/e-1'), () => HttpResponse.json(eventoDetalhe({ preco: 25 }))),
      http.post(rota('/eventos/e-1/inscricoes'), () => HttpResponse.json({ id: 'i-1', status: 'PENDENTE_PAGAMENTO', codigoCheckin: null, reservadaAte: '2099-01-01T00:00:00Z', pagamento: { id: 'p-1', valor: 25, urlPagamento: 'https://gateway.test/stub_p1' } }, { status: 201 })),
      http.get(rota('/inscricoes/minhas'), () => HttpResponse.json([inscricaoExemplo({ status: 'PENDENTE_PAGAMENTO', reservadaAte: '2099-01-01T00:00:00Z', evento: { id: 'e-1', titulo: 'Workshop de Inteligência Artificial', dataInicio: '2099-11-18T17:00:00Z', local: 'Laboratório 04' } })])),
      http.get(rota('/inscricoes/i-1/pagamento'), () => {
        consultas += 1
        return HttpResponse.json({ status: consultas >= 3 ? 'APROVADO' : 'PENDENTE', valor: 25, metodo: null, atualizadoEm: '2099-01-01T00:00:00Z', statusInscricao: consultas >= 3 ? 'CONFIRMADA' : 'PENDENTE_PAGAMENTO' })
      }),
      ...handlers,
    )
    const usuario = userEvent.setup()
    renderizarApp('/eventos/e-1')

    await usuario.click(await screen.findByRole('button', { name: /Inscrever-se por/ }))

    expect(await screen.findByRole('heading', { name: 'Pagamento' })).toBeInTheDocument()
    expect(await screen.findByText(/Sem taxa de plataforma/)).toBeInTheDocument()
    expect(await screen.findByText(/Pagamento aprovado!/, undefined, { timeout: 3000 })).toBeInTheDocument()
    expect(consultas).toBeGreaterThanOrEqual(3)
  })

  it('CTW10 — cancelar a inscrição pede confirmação e informa o estorno', async () => {
    const { handlers } = sessaoRestauravel()
    servidor.use(
      http.get(rota('/inscricoes/minhas'), () => HttpResponse.json([inscricaoExemplo()])),
      http.post(rota('/inscricoes/i-1/cancelar'), () => HttpResponse.json({ status: 'CANCELADA', estornoSolicitado: true })),
      ...handlers,
    )
    const usuario = userEvent.setup()
    renderizarApp('/minhas-inscricoes')

    await usuario.click(await screen.findByRole('button', { name: 'Cancelar inscrição' }))
    const dialogo = await screen.findByRole('dialog')
    await usuario.click(within(dialogo).getByRole('button', { name: 'Cancelar inscrição' }))

    expect(await screen.findByText(/estorno do pagamento foi solicitado/)).toBeInTheDocument()
  })

  it('CTW10 — fora do prazo (422) mostra a mensagem da API', async () => {
    const { handlers } = sessaoRestauravel()
    servidor.use(
      http.get(rota('/inscricoes/minhas'), () => HttpResponse.json([inscricaoExemplo()])),
      http.post(rota('/inscricoes/i-1/cancelar'), () => problema(422, 'PRAZO_CANCELAMENTO_ENCERRADO', 'O cancelamento só é possível até 24 horas antes do início.')),
      ...handlers,
    )
    const usuario = userEvent.setup()
    renderizarApp('/minhas-inscricoes')

    await usuario.click(await screen.findByRole('button', { name: 'Cancelar inscrição' }))
    await usuario.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancelar inscrição' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('até 24 horas antes do início')
  })
})

describe('notificações e perfil', () => {
  it('CTW12 — o sino mostra o número de não lidas', async () => {
    const { chamadas } = sessaoRestauravel()
    servidor.use(
      http.post(rota('/auth/renovar'), () => (chamadas.renovar++, HttpResponse.json({ tokenAcesso: 'tok-1', expiraEm: '2099-01-01T00:00:00Z' }))),
      http.get(rota('/usuarios/me'), () => HttpResponse.json(perfilExemplo)),
      http.get(rota('/notificacoes'), () => HttpResponse.json({ itens: [], naoLidas: 3, pagina: 1, total: 3 })),
      listaVazia,
    )
    renderizarApp('/')

    expect(await screen.findByLabelText('3 não lidas')).toBeInTheDocument()
  })

  it('CTW13 — marcar todas como lidas chama a API', async () => {
    const { handlers } = sessaoRestauravel()
    let marcadas = false
    servidor.use(
      http.patch(rota('/notificacoes/lidas'), () => ((marcadas = true), new HttpResponse(null, { status: 204 }))),
      http.get(rota('/notificacoes'), () =>
        HttpResponse.json({ itens: [{ id: 'n-1', tipo: 'INSCRICAO', titulo: 'Inscrição confirmada', mensagem: 'Você está inscrito na Semana Acadêmica.', eventoId: 'e-1', lida: false, criadoEm: '2099-01-01T00:00:00Z' }], naoLidas: 1, pagina: 1, total: 1 }),
      ),
      ...handlers,
    )
    const usuario = userEvent.setup()
    renderizarApp('/notificacoes')

    expect(await screen.findByText('Inscrição confirmada')).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Marcar todas como lidas' }))
    await waitFor(() => expect(marcadas).toBe(true))
  })

  it('salvar o perfil mostra a confirmação e atualiza o nome no cabeçalho', async () => {
    const { handlers } = sessaoRestauravel()
    let corpo: Record<string, unknown> | null = null
    servidor.use(
      http.put(rota('/usuarios/me'), async ({ request }) => {
        corpo = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ ...perfilExemplo, nome: 'Maria Souza' })
      }),
      ...handlers,
    )
    const usuario = userEvent.setup()
    renderizarApp('/perfil')

    const nome = await screen.findByLabelText('Nome')
    await usuario.clear(nome)
    await usuario.type(nome, 'Maria Souza')
    await usuario.click(screen.getByRole('button', { name: 'Salvar perfil' }))

    expect(await screen.findByText('Perfil atualizado.')).toBeInTheDocument()
    expect(corpo).toMatchObject({ nome: 'Maria Souza', telefone: '+5544999999999' })
    expect(await screen.findAllByText('Maria Souza')).not.toHaveLength(0)
  })

  it('CTW15 — o aceite de SMS fica desabilitado sem telefone verificado', async () => {
    const { handlers } = sessaoRestauravel()
    servidor.use(http.get(rota('/usuarios/me'), () => HttpResponse.json({ ...perfilExemplo, telefoneVerificado: false })), ...handlers)
    renderizarApp('/perfil')

    expect(await screen.findByRole('button', { name: 'Ativar avisos por SMS' })).toBeDisabled()
    expect(screen.getByText('Telefone não verificado')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enviar código' })).toBeInTheDocument()
  })
})

describe('gestão do evento', () => {
  it('CTW16 — o motivo da alteração só aparece em evento publicado quando um campo relevante muda', async () => {
    const { handlers } = sessaoRestauravel()
    servidor.use(http.get(rota('/eventos/e-1'), () => HttpResponse.json(eventoDetalhe({ souOrganizador: true }), { headers: { ETag: '"7"' } })), ...handlers)
    const usuario = userEvent.setup()
    renderizarApp('/meus-eventos/e-1/editar')

    const local = await screen.findByLabelText('Local')
    expect(screen.queryByLabelText('Motivo da alteração')).not.toBeInTheDocument()
    await usuario.clear(local)
    await usuario.type(local, 'Auditório B')
    expect(await screen.findByLabelText('Motivo da alteração')).toBeInTheDocument()
  })

  it('CTW17 — edição concorrente (412) oferece recarregar', async () => {
    const { handlers } = sessaoRestauravel()
    let ifMatch: string | null = null
    servidor.use(
      http.get(rota('/eventos/e-1'), () => HttpResponse.json(eventoDetalhe({ souOrganizador: true, status: 'RASCUNHO', inscricaoFim: '2026-11-12T20:00:00Z' }), { headers: { ETag: '"7"' } })),
      http.put(rota('/eventos/e-1'), ({ request }) => {
        ifMatch = request.headers.get('if-match')
        return problema(412, 'VERSAO_DESATUALIZADA', 'O evento foi alterado por outra pessoa.')
      }),
      ...handlers,
    )
    const usuario = userEvent.setup()
    renderizarApp('/meus-eventos/e-1/editar')

    await usuario.type(await screen.findByLabelText('Título do evento'), ' 2026')
    await usuario.click(screen.getByRole('button', { name: 'Salvar rascunho' }))

    expect(await screen.findByText(/alterado por outra pessoa/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Recarregar a página' })).toBeInTheDocument()
    expect(ifMatch).toBe('"7"')
  })

  it('CTW18 — colaborador vê inscritos e check-in, mas não cancelar nem gerenciar programação', async () => {
    const { handlers } = sessaoRestauravel()
    servidor.use(
      http.get(rota('/eventos/e-1'), () => HttpResponse.json(eventoDetalhe({ souColaborador: true }))),
      http.get(rota('/eventos/e-1/inscricoes'), () => HttpResponse.json({ itens: [{ inscricaoId: 'i-1', nome: 'João Souza', email: 'joao@exemplo.com', status: 'CONFIRMADA', presencaConfirmada: false, checkinEm: null }], pagina: 1, tamanhoPagina: 20, total: 1 })),
      ...handlers,
    )
    renderizarApp('/meus-eventos/e-1')

    expect(await screen.findByText('João Souza')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Check-in' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancelar evento' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Gerenciar programação' })).not.toBeInTheDocument()
  })

  it('CTW19 — check-in converte o código para maiúsculas e trata erros da API', async () => {
    const { handlers } = sessaoRestauravel()
    const codigos: string[] = []
    servidor.use(
      http.get(rota('/eventos/e-1'), () => HttpResponse.json(eventoDetalhe({ souColaborador: true }))),
      http.get(rota('/eventos/e-1/inscricoes'), () => HttpResponse.json({ itens: [], pagina: 1, tamanhoPagina: 20, total: 0 })),
      http.post(rota('/eventos/e-1/checkin'), async ({ request }) => {
        const { codigoCheckin } = (await request.json()) as { codigoCheckin: string }
        codigos.push(codigoCheckin)
        return codigos.length === 1 ? HttpResponse.json({ nome: 'Maria Oliveira', checkinEm: '2099-11-12T22:05:00Z' }) : problema(409, 'CHECKIN_JA_REALIZADO', 'Check-in já realizado.')
      }),
      ...handlers,
    )
    const usuario = userEvent.setup()
    renderizarApp('/meus-eventos/e-1')

    await usuario.click(await screen.findByRole('tab', { name: 'Check-in' }))
    await usuario.type(screen.getByLabelText('Código de check-in'), 'vt2026ab1201')
    await usuario.click(screen.getByRole('button', { name: 'Confirmar presença' }))
    expect(await screen.findByText(/Presença de Maria Oliveira confirmada/)).toBeInTheDocument()

    await usuario.type(screen.getByLabelText('Código de check-in'), 'vt2026ab1201')
    await usuario.click(screen.getByRole('button', { name: 'Confirmar presença' }))
    expect(await screen.findByText(/já foi realizado/)).toBeInTheDocument()
    expect(codigos).toEqual(['VT2026AB1201', 'VT2026AB1201'])
  })

  it('código de check-in com tamanho errado é barrado no cliente', async () => {
    const { handlers } = sessaoRestauravel()
    servidor.use(
      http.get(rota('/eventos/e-1'), () => HttpResponse.json(eventoDetalhe({ souColaborador: true }))),
      http.get(rota('/eventos/e-1/inscricoes'), () => HttpResponse.json({ itens: [], pagina: 1, tamanhoPagina: 20, total: 0 })),
      ...handlers,
    )
    const usuario = userEvent.setup()
    renderizarApp('/meus-eventos/e-1')

    await usuario.click(await screen.findByRole('tab', { name: 'Check-in' }))
    await usuario.type(screen.getByLabelText('Código de check-in'), 'ABC')
    await usuario.click(screen.getByRole('button', { name: 'Confirmar presença' }))

    expect(await screen.findByText('O código deve ter 12 caracteres alfanuméricos.')).toBeInTheDocument()
  })
})

describe('certificado público', () => {
  it('CTW22 — valida um certificado sem login', async () => {
    servidor.use(
      visitante(),
      http.get(rota('/certificados/ABC123/validacao'), () => HttpResponse.json({ valido: true, participante: 'Maria Oliveira', evento: 'Semana Acadêmica de Tecnologia', dataEvento: '2026-11-12T22:00:00Z', cargaHoraria: 3, emitidoEm: '2026-11-13T12:00:00Z' })),
    )
    renderizarApp('/certificados/ABC123')

    expect(await screen.findByText('VÁLIDO')).toBeInTheDocument()
    expect(screen.getByText('Maria Oliveira')).toBeInTheDocument()
    expect(screen.getByText('3 horas')).toBeInTheDocument()
  })

  it('CTW22 — código desconhecido mostra "Certificado não encontrado"', async () => {
    servidor.use(visitante(), http.get(rota('/certificados/XXXX/validacao'), () => problema(404, 'CERTIFICADO_NAO_ENCONTRADO', 'Certificado não encontrado.')))
    renderizarApp('/certificados/XXXX')

    expect(await screen.findByRole('heading', { name: 'Certificado não encontrado' })).toBeInTheDocument()
  })

  it('digitar o código leva à rota de validação', async () => {
    servidor.use(visitante(), http.get(rota('/certificados/ABC123/validacao'), () => problema(404, 'CERTIFICADO_NAO_ENCONTRADO', 'Certificado não encontrado.')))
    const usuario = userEvent.setup()
    renderizarApp('/certificados')

    await usuario.type(await screen.findByLabelText('Código de validação'), 'ABC123')
    await usuario.click(screen.getByRole('button', { name: 'Validar certificado' }))

    await waitFor(() => expect(screen.getByTestId('local')).toHaveTextContent('/certificados/ABC123'))
  })
})

describe('navegação', () => {
  it('rota inexistente mostra a página 404', async () => {
    servidor.use(visitante())
    renderizarApp('/nao-existe')
    expect(await screen.findByRole('heading', { name: 'Página não encontrada' })).toBeInTheDocument()
  })

  it('no mobile o menu hambúrguer abre e fecha a gaveta de navegação', async () => {
    servidor.use(visitante(), listaVazia)
    const usuario = userEvent.setup()
    renderizarApp('/')

    const botao = await screen.findByRole('button', { name: 'Abrir menu' })
    await usuario.click(botao)
    expect(screen.getByRole('navigation', { name: 'Menu' })).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Fechar menu' }))
    expect(screen.queryByRole('navigation', { name: 'Menu' })).not.toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
  })
})
