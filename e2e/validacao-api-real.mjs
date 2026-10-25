import { chromium } from 'playwright-core'
import { execSync } from 'node:child_process'
import fs from 'node:fs'

// Validação ponta a ponta do frontend contra a API real (ver docs/validacao-api-real.md).
// Variáveis: VITEME_WEB (padrão http://localhost:5173), VITEME_API_LOG (log da API, para ler o código de SMS),
// PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE (banco da API, para apoio: ler códigos e encerrar um evento) e CHROME (opcional).
const BASE = process.env.VITEME_WEB ?? 'http://localhost:5173'
const LOG_API = process.env.VITEME_API_LOG ?? '/tmp/api-e2e.log'
const DIR = process.argv[2] ?? 'e2e/saida'
fs.mkdirSync(DIR, { recursive: true })
const resultados = []
const sufixo = Date.now().toString(36)
const emailA = `org-${sufixo}@exemplo.com`
const emailB = `part-${sufixo}@exemplo.com`
const SENHA = 'Senha123'
// A API limita a 5 códigos de SMS por hora por telefone (D45): cada execução usa um número novo.
const telefoneB = '449' + String(Math.floor(Math.random() * 1e8)).padStart(8, '0')

const local = (min) => { const d = new Date(Date.now() + min * 60000); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}` }
const pg = { host: process.env.PGHOST ?? 'localhost', port: process.env.PGPORT ?? '5432', user: process.env.PGUSER ?? 'postgres', pass: process.env.PGPASSWORD ?? 'postgres', db: process.env.PGDATABASE ?? 'viteme_e2e' }
const sql = (q) => execSync(`psql -h ${pg.host} -p ${pg.port} -U ${pg.user} -d ${pg.db} -tAc "${q.replace(/"/g, '\\"')}"`, { env: { ...process.env, PGPASSWORD: pg.pass } }).toString().trim()

const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined })
const ctxA = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true })
const ctxB = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true })
const A = await ctxA.newPage()
const B = await ctxB.newPage()
for (const [nome, p] of [['A', A], ['B', B]]) {
  p.on('console', (m) => m.type() === 'error' && console.log(`  [console ${nome}]`, m.text().slice(0, 200)))
  p.on('pageerror', (e) => console.log(`  [pageerror ${nome}]`, e.message.slice(0, 200)))
}
let contador = 0
async function passo(nome, fn, page) {
  try {
    await fn()
    resultados.push([nome, 'PASSOU'])
    console.log('PASSOU ', nome)
  } catch (e) {
    resultados.push([nome, 'FALHOU', String(e.message).split('\n')[0]])
    console.log('FALHOU ', nome, '\n        ', String(e.message).split('\n').slice(0, 3).join(' | '))
    if (page) await page.screenshot({ path: `${DIR}/falha-${++contador}.png`, fullPage: true }).catch(() => {})
  }
}
const ver = (page, texto, t = 10000) => page.getByText(texto).first().waitFor({ timeout: t })
const rotulo = (page, r) => page.getByLabel(r, { exact: true })

// ---------- A: organizador ----------
await passo('A: cadastro cria a conta e entra automaticamente', async () => {
  await A.goto(BASE + '/cadastro')
  await rotulo(A, 'Nome completo').fill('Organizador E2E')
  await rotulo(A, 'E-mail').fill(emailA)
  await rotulo(A, 'Senha').fill(SENHA)
  await rotulo(A, 'Confirmar senha').fill(SENHA)
  await A.getByRole('button', { name: 'Criar conta' }).click()
  await A.getByRole('heading', { name: 'Descubra eventos' }).waitFor({ timeout: 10000 })
  await ver(A, 'Organizador E2E')
}, A)

await passo('A: F5 restaura a sessão pelo cookie (SameSite=None + X-Requested-With)', async () => {
  await A.reload()
  await ver(A, 'Organizador E2E')
  const cookies = await ctxA.cookies()
  const c = cookies.find((x) => x.name === 'refresh_token')
  if (!c) throw new Error('cookie refresh_token não existe')
  if (!(c.httpOnly && c.secure && c.sameSite === 'None')) throw new Error('flags do cookie: ' + JSON.stringify(c))
}, A)

const criarEvento = async (titulo, preco, inicioMin, fimInscMin) => {
  await A.goto(BASE + '/meus-eventos/novo')
  await rotulo(A, 'Título do evento').fill(titulo)
  await rotulo(A, 'Descrição').fill('Evento criado pelo teste ponta a ponta.')
  await rotulo(A, 'Categoria').selectOption('Workshop')
  await rotulo(A, 'Local').fill('Laboratório 04')
  await rotulo(A, 'Início do evento').fill(local(inicioMin))
  await rotulo(A, 'Término do evento').fill(local(inicioMin + 240))
  await rotulo(A, 'Inscrições abrem em').fill(local(-120))
  await rotulo(A, 'Inscrições encerram em').fill(local(fimInscMin))
  await rotulo(A, 'Preço').fill(preco)
  await rotulo(A, 'Capacidade (opcional)').fill('5')
  await rotulo(A, 'Carga horária em horas (opcional)').fill('3')
  await A.getByRole('button', { name: 'Salvar rascunho' }).click()
  await A.waitForURL(/\/meus-eventos\/[0-9a-f-]{36}\/editar/, { timeout: 10000 })
  return A.url().match(/eventos\/([0-9a-f-]{36})/)[1]
}
const publicar = async (id) => {
  await A.getByRole('button', { name: 'Publicar evento' }).click()
  await A.waitForURL(new RegExp(`/meus-eventos/${id}$`), { timeout: 10000 })
  await ver(A, 'Evento publicado!')
}

let idGratis, idPago
await passo('A: cria evento gratuito como rascunho (T10 → E12) e vai para a edição', async () => { idGratis = await criarEvento(`E2E Gratuito ${sufixo}`, '0', 90, 60) }, A)
await passo('A: adiciona atividade à programação (E18)', async () => {
  await A.getByRole('button', { name: '+ Adicionar atividade' }).click()
  await rotulo(A, 'Título da atividade').fill('Abertura')
  await rotulo(A, 'Início').fill(local(90))
  await rotulo(A, 'Término').fill(local(120))
  await A.getByRole('button', { name: 'Salvar atividade' }).click()
  await ver(A, 'Abertura')
}, A)
await passo('A: publica o evento gratuito (E14) e cai na gestão', async () => { await publicar(idGratis) }, A)
await passo('A: cria e publica evento pago de R$ 25,00', async () => { idPago = await criarEvento(`E2E Pago ${sufixo}`, '25,00', 60 * 72, 60 * 71); await publicar(idPago) }, A)

// ---------- B: participante ----------
await passo('B: cadastro com telefone (E.164) e login automático', async () => {
  await B.goto(BASE + '/cadastro')
  await rotulo(B, 'Nome completo').fill('Participante E2E')
  await rotulo(B, 'E-mail').fill(emailB)
  await rotulo(B, 'Senha').fill(SENHA)
  await rotulo(B, 'Confirmar senha').fill(SENHA)
  await rotulo(B, 'Telefone (opcional)').fill(telefoneB)
  await B.getByRole('button', { name: 'Criar conta' }).click()
  await ver(B, 'Participante E2E')
  const tel = sql(`select telefone from usuario where email='${emailB}'`)
  if (tel !== `+55${telefoneB}`) throw new Error('telefone gravado: ' + tel)
}, B)
await passo('B: mural mostra os dois eventos; busca filtra por título', async () => {
  await B.goto(BASE + '/')
  await ver(B, `E2E Gratuito ${sufixo}`); await ver(B, `E2E Pago ${sufixo}`)
  await B.getByLabel('Buscar eventos').fill(`Pago ${sufixo}`)
  await B.waitForFunction((t) => !document.body.innerText.includes(t), `E2E Gratuito ${sufixo}`, { timeout: 8000 })
  await ver(B, `E2E Pago ${sufixo}`)
}, B)
await passo('B: inscrição gratuita confirma e mostra o código de check-in (E24 → T05)', async () => {
  await B.goto(BASE + `/eventos/${idGratis}`)
  await B.getByRole('button', { name: 'Inscrever-se gratuitamente' }).click()
  await B.getByRole('heading', { name: 'Minhas inscrições' }).waitFor({ timeout: 10000 })
  await ver(B, 'Inscrição confirmada!')
}, B)
let codigo
await passo('B: código de check-in tem 12 caracteres', async () => {
  codigo = sql(`select codigo_checkin from inscricao i join usuario u on u.id=i.usuario_id where u.email='${emailB}' and i.status='CONFIRMADA' limit 1`)
  if (!/^[A-Z0-9]{12}$/.test(codigo)) throw new Error('código: ' + codigo)
  await ver(B, codigo)
}, B)
await passo('B: inscrição paga leva à tela de pagamento com R$ 25,00', async () => {
  await B.goto(BASE + `/eventos/${idPago}`)
  await B.getByRole('button', { name: /Inscrever-se por/ }).click()
  await B.getByRole('heading', { name: 'Pagamento' }).waitFor({ timeout: 10000 })
  await ver(B, 'Sem taxa de plataforma')
  await B.getByText(/R\$\s?25,00/).first().waitFor({ timeout: 5000 })
}, B)
await passo('B: simular aprovação (webhook) confirma a inscrição e volta a T05', async () => {
  await B.getByRole('button', { name: 'Simular pagamento aprovado' }).click()
  await B.getByRole('heading', { name: 'Minhas inscrições' }).waitFor({ timeout: 15000 })
  await ver(B, 'Pagamento aprovado!')
}, B)


// ---------- A: gestão do evento gratuito ----------
await passo('A: gestão lista o inscrito (E27) sem telefone', async () => {
  await A.goto(BASE + `/meus-eventos/${idGratis}`)
  await ver(A, 'Participante E2E'); await A.locator('.selo', { hasText: 'CONFIRMADA' }).first().waitFor({ timeout: 8000 })
  const texto = await A.locator('main').innerText()
  if (texto.includes('99999')) throw new Error('telefone apareceu na lista de inscritos')
}, A)
await passo('A: check-in com o código do participante (E28), repetir dá erro', async () => {
  await A.getByRole('tab', { name: 'Check-in' }).click()
  await rotulo(A, 'Código de check-in').fill(codigo.toLowerCase())
  await A.getByRole('button', { name: 'Confirmar presença' }).click()
  await ver(A, 'Presença de Participante E2E confirmada')
  await rotulo(A, 'Código de check-in').fill(codigo)
  await A.getByRole('button', { name: 'Confirmar presença' }).click()
  await ver(A, 'já foi realizado')
}, A)
await passo('A: aba Inscritos mostra a presença registrada', async () => {
  await A.getByRole('tab', { name: 'Inscritos' }).click()
  await ver(A, 'Presente')
}, A)
await passo('A: editar evento publicado exige motivo (RN13) e salva com ele (E13 + If-Match)', async () => {
  await A.goto(BASE + `/meus-eventos/${idGratis}/editar`)
  await rotulo(A, 'Local').fill('Auditório principal')
  await rotulo(A, 'Motivo da alteração').waitFor({ timeout: 5000 })
  await A.getByRole('button', { name: 'Salvar alterações' }).click()
  await ver(A, 'Informe o motivo da alteração')
  await rotulo(A, 'Motivo da alteração').fill('Mudamos para um espaço maior.')
  await A.getByRole('button', { name: 'Salvar alterações' }).click()
  await ver(A, 'Alterações salvas')
  const n = sql(`select count(*) from alteracao_evento where evento_id='${idGratis}'`)
  if (Number(n) < 1) throw new Error('alteração não registrada no banco')
}, A)
await passo('A: salvar de novo na mesma tela usa a versão nova (sem 412)', async () => {
  await rotulo(A, 'Título do evento').fill(`E2E Gratuito ${sufixo}`)
  await rotulo(A, 'Local').fill('Auditório B')
  await rotulo(A, 'Motivo da alteração').fill('Outra mudança de sala.')
  await A.getByRole('button', { name: 'Salvar alterações' }).click()
  await ver(A, 'Alterações salvas')
}, A)
await passo('A: colaborador inexistente mostra erro no campo (E22)', async () => {
  await A.goto(BASE + `/meus-eventos/${idGratis}`)
  await A.getByRole('tab', { name: 'Colaboradores' }).click()
  await rotulo(A, 'E-mail do colaborador').fill('ninguem@exemplo.com')
  await A.getByRole('button', { name: 'Adicionar' }).click()
  await ver(A, 'Não há usuário cadastrado com este e-mail.')
}, A)
await passo('A: participante já inscrito não pode ser colaborador (422)', async () => {
  await rotulo(A, 'E-mail do colaborador').fill(emailB)
  await A.getByRole('button', { name: 'Adicionar' }).click()
  await A.getByRole('alert').first().waitFor({ timeout: 8000 })
}, A)
await passo('A: aba Alterações lista o histórico (E17)', async () => {
  await A.getByRole('tab', { name: 'Alterações' }).click()
  await ver(A, 'Outra mudança de sala.')
}, A)

// ---------- B: alterações, notificações, perfil ----------
await passo('B: mural mostra o selo "Alterado" no evento alterado', async () => {
  await B.goto(BASE + '/')
  const card = B.locator('a', { hasText: `E2E Gratuito ${sufixo}` })
  await card.getByText('Alterado').waitFor({ timeout: 8000 })
}, B)
await passo('B: detalhe mostra o motivo da alteração', async () => {
  await B.goto(BASE + `/eventos/${idGratis}`)
  await ver(B, 'Este evento foi alterado'); await ver(B, 'Outra mudança de sala.')
}, B)
await passo('B: sino mostra notificações não lidas; página lista e marca como lidas', async () => {
  await B.goto(BASE + '/notificacoes')
  await B.getByRole('heading', { name: 'Notificações' }).waitFor()
  await B.getByText(/Alteração|Inscrição confirmada|alterado/i).first().waitFor({ timeout: 8000 })
  const n = await B.locator('.contador').first().innerText().catch(() => '0')
  if (!(Number(n) > 0)) throw new Error('contador do sino: ' + n)
  await B.getByRole('button', { name: 'Marcar todas como lidas' }).click()
  await B.locator('.contador').first().waitFor({ state: 'detached', timeout: 8000 })
}, B)
await passo('B: verificar telefone com o código enviado por SMS (E07/E08) e ativar avisos (E09)', async () => {
  await B.goto(BASE + '/perfil')
  await B.getByRole('button', { name: 'Enviar código' }).click()
  await rotulo(B, 'Código recebido').waitFor({ timeout: 8000 })
  let cod = null
  for (let i = 0; i < 15 && !cod; i++) {
    await new Promise((r) => setTimeout(r, 1000))
    const log = fs.readFileSync(LOG_API, 'utf8')
    const m = [...log.matchAll(/\[SMS stub\][^\n]*?(\d{6})/g)].pop()
    cod = m && m[1]
  }
  if (!cod) throw new Error('código não apareceu no log da API')
  await rotulo(B, 'Código recebido').fill(cod)
  await B.getByRole('button', { name: 'Confirmar código' }).click()
  await ver(B, 'Telefone verificado')
  await B.getByRole('button', { name: 'Ativar avisos por SMS' }).click()
  await B.getByText('ATIVO').waitFor({ timeout: 8000 })
  const r = sql(`select telefone_verificado, aceita_sms from usuario where email='${emailB}'`)
  if (r !== 't|t') throw new Error('estado no banco: ' + r)
}, B)
await passo('B: salvar perfil com novo nome (E06)', async () => {
  await rotulo(B, 'Nome').fill('Participante E2E Editado')
  await B.getByRole('button', { name: 'Salvar perfil' }).click()
  await ver(B, 'Perfil atualizado.')
  await ver(B, 'Participante E2E Editado')
}, B)
await passo('B: denunciar evento (E37), repetir mostra erro de denúncia existente', async () => {
  await B.goto(BASE + `/eventos/${idPago}`)
  await B.getByRole('button', { name: 'Denunciar este evento' }).click()
  await B.getByLabel('Motivo').selectOption('SPAM')
  await B.getByRole('button', { name: 'Enviar denúncia' }).click()
  await ver(B, 'Denúncia enviada')
  await B.getByRole('button', { name: 'Fechar' }).click()
  await B.getByRole('button', { name: 'Denunciar este evento' }).click()
  await B.getByLabel('Motivo').selectOption('SPAM')
  await B.getByRole('button', { name: 'Enviar denúncia' }).click()
  await B.getByRole('alert').first().waitFor({ timeout: 8000 })
}, B)
await passo('B: cancelar a inscrição paga pede confirmação e informa o estorno (E26)', async () => {
  await B.goto(BASE + '/minhas-inscricoes')
  const item = B.locator('article', { hasText: `E2E Pago ${sufixo}` })
  await item.getByRole('button', { name: 'Cancelar inscrição' }).click()
  await B.getByRole('dialog').getByRole('button', { name: 'Cancelar inscrição' }).click()
  await ver(B, 'estorno do pagamento foi solicitado')
}, B)

// ---------- certificado ----------
await passo('banco: encerra o evento gratuito para liberar o certificado (RN21)', async () => {
  sql(`update evento set inscricao_inicio=now()-interval '2 days', inscricao_fim=now()-interval '6 hours', data_inicio=now()-interval '5 hours', data_fim=now()-interval '1 hour', status='ENCERRADO' where id='${idGratis}'`)
}, null)
await passo('B: baixa o certificado em PDF na aba Anteriores (E38)', async () => {
  await B.goto(BASE + '/minhas-inscricoes')
  await B.getByRole('tab', { name: 'Anteriores' }).click()
  const [download] = await Promise.all([B.waitForEvent('download', { timeout: 15000 }), B.getByRole('button', { name: 'Baixar certificado' }).click()])
  const arq = `${DIR}/certificado.pdf`
  await download.saveAs(arq)
  const cab = fs.readFileSync(arq).subarray(0, 5).toString()
  if (cab !== '%PDF-') throw new Error('arquivo não é PDF: ' + cab)
}, B)
await passo('visitante: valida o certificado pelo código público (E39)', async () => {
  const cod = sql(`select codigo_validacao from certificado c join inscricao i on i.id=c.inscricao_id join usuario u on u.id=i.usuario_id where u.email='${emailB}' limit 1`)
  if (!cod) throw new Error('certificado não emitido')
  const ctxV = await browser.newContext()
  const V = await ctxV.newPage()
  await V.goto(BASE + `/certificados/${cod}`)
  await V.getByText('VÁLIDO', { exact: true }).waitFor({ timeout: 8000 })
  await V.getByText('Participante E2E Editado').first().waitFor({ timeout: 5000 })
  await V.goto(BASE + '/certificados/CODIGOINEXISTENTE')
  await V.getByRole('heading', { name: 'Certificado não encontrado' }).waitFor({ timeout: 8000 })
  await ctxV.close()
}, null)


await passo('B: filtros do mural por categoria e "Gratuitos"', async () => {
  await B.goto(BASE + '/')
  await B.getByRole('button', { name: 'Palestras' }).click()
  await B.getByText('Nenhum evento encontrado').waitFor({ timeout: 8000 })
  await B.getByRole('button', { name: 'Workshops' }).click()
  await ver(B, `E2E Pago ${sufixo}`)
  await B.getByRole('button', { name: 'Gratuitos' }).click()
  await B.waitForFunction((t) => !document.body.innerText.includes(t), `E2E Pago ${sufixo}`, { timeout: 8000 })
}, B)
await passo('B: nova inscrição paga; simular recusa mostra aviso e permite tentar de novo (E29)', async () => {
  await B.goto(BASE + `/eventos/${idPago}`)
  await B.getByRole('button', { name: /Inscrever-se por/ }).click()
  await B.getByRole('heading', { name: 'Pagamento' }).waitFor({ timeout: 10000 })
  await B.getByRole('button', { name: 'Simular recusa' }).click()
  await B.getByText('O pagamento foi recusado.').waitFor({ timeout: 15000 })
  await B.getByRole('button', { name: 'Tentar pagamento novamente' }).waitFor({ timeout: 5000 })
}, B)
await passo('B: "Continuar pagamento" em Minhas inscrições abre a tela de pagamento', async () => {
  await B.goto(BASE + '/minhas-inscricoes')
  await B.getByRole('link', { name: 'Continuar pagamento' }).click()
  await B.getByRole('heading', { name: 'Pagamento' }).waitFor({ timeout: 8000 })
}, B)
await passo('A: cancelar o evento pago (motivo + confirmação) cancela as inscrições (E15/RN14)', async () => {
  await A.goto(BASE + `/meus-eventos/${idPago}`)
  await A.getByRole('button', { name: 'Cancelar evento' }).click()
  await A.getByRole('dialog').getByLabel('Motivo do cancelamento').fill('curto')
  await A.getByRole('dialog').getByRole('button', { name: 'Confirmar cancelamento' }).click()
  await A.getByText('O motivo deve ter entre 10 e 300 caracteres.').waitFor({ timeout: 5000 })
  await A.getByRole('dialog').getByLabel('Motivo do cancelamento').fill('Cancelado pelo teste ponta a ponta.')
  await A.getByRole('dialog').getByRole('button', { name: 'Confirmar cancelamento' }).click()
  await A.getByText('CANCELADO').first().waitFor({ timeout: 10000 })
  const st = sql(`select status from inscricao i join usuario u on u.id=i.usuario_id where u.email='${emailB}' and i.evento_id='${idPago}' order by i.criado_em desc limit 1`)
  if (st !== 'CANCELADA') throw new Error('inscrição ficou ' + st)
}, A)
await passo('mobile 390px: mural, menu hambúrguer e barra de abas inferior', async () => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); const M = await ctx.newPage()
  await M.goto(BASE + '/entrar')
  await rotulo(M, 'E-mail').fill(emailB); await rotulo(M, 'Senha').fill(SENHA)
  await M.getByRole('button', { name: 'Entrar' }).click()
  await M.getByRole('heading', { name: 'Descubra eventos' }).waitFor({ timeout: 10000 })
  await M.getByRole('button', { name: 'Abrir menu' }).click()
  await M.getByRole('navigation', { name: 'Menu' }).waitFor()
  await M.screenshot({ path: `${DIR}/mobile-menu.png` })
  await M.getByRole('navigation', { name: 'Menu' }).getByRole('link', { name: 'Meus eventos' }).click()
  await M.getByRole('heading', { name: 'Meus eventos' }).waitFor({ timeout: 8000 })
  await M.getByRole('navigation', { name: 'Navegação rápida' }).getByRole('link', { name: 'Perfil' }).click()
  await M.getByRole('heading', { name: 'Meu perfil' }).waitFor({ timeout: 8000 })
  const larguraPagina = await M.evaluate(() => document.documentElement.scrollWidth)
  if (larguraPagina > 390) throw new Error('rolagem horizontal no mobile: ' + larguraPagina)
  await M.screenshot({ path: `${DIR}/mobile-perfil.png`, fullPage: true })
  await ctx.close()
}, null)

// ---------- sessão ----------
await passo('B: três abas abrindo juntas restauram a sessão sem derrubar o login (Web Locks)', async () => {
  const abas = await Promise.all([ctxB.newPage(), ctxB.newPage(), ctxB.newPage()])
  await Promise.all(abas.map((p) => p.goto(BASE + '/')))
  for (const p of abas) await p.getByText('Participante E2E Editado').first().waitFor({ timeout: 12000 })
  await abas[0].reload()
  await abas[0].getByText('Participante E2E Editado').first().waitFor({ timeout: 12000 })
  for (const p of abas) await p.close()
}, B)
await passo('A: Sair encerra a sessão; F5 continua deslogado; cookie é removido (E04)', async () => {
  await A.goto(BASE + '/')
  await A.getByRole('button', { name: 'Sair' }).click()
  await A.getByRole('link', { name: 'Entrar' }).first().waitFor({ timeout: 8000 })
  await A.reload()
  await A.getByRole('link', { name: 'Entrar' }).first().waitFor({ timeout: 8000 })
  const c = (await ctxA.cookies()).find((x) => x.name === 'refresh_token')
  if (c) throw new Error('cookie ainda existe após logout')
}, A)
await passo('A: rota protegida sem sessão vai ao login e volta depois de entrar', async () => {
  await A.goto(BASE + '/meus-eventos')
  await A.getByRole('heading', { name: 'Entrar na sua conta' }).waitFor({ timeout: 8000 })
  await rotulo(A, 'E-mail').fill(emailA); await rotulo(A, 'Senha').fill(SENHA)
  await A.getByRole('button', { name: 'Entrar' }).click()
  await A.getByRole('heading', { name: 'Meus eventos' }).waitFor({ timeout: 10000 })
  await ver(A, `E2E Gratuito ${sufixo}`)
}, A)
await passo('A: login com senha errada mostra mensagem genérica', async () => {
  const ctx = await browser.newContext(); const P = await ctx.newPage()
  await P.goto(BASE + '/entrar')
  await rotulo(P, 'E-mail').fill(emailA); await rotulo(P, 'Senha').fill('Errada123')
  await P.getByRole('button', { name: 'Entrar' }).click()
  await P.getByText('E-mail ou senha incorretos').first().waitFor({ timeout: 8000 })
  await ctx.close()
}, null)

fs.writeFileSync(`${DIR}/resultado.json`, JSON.stringify(resultados, null, 2))
console.log('\n=== resumo ===')
console.log(resultados.filter((r) => r[1] === 'PASSOU').length, 'passaram;', resultados.filter((r) => r[1] === 'FALHOU').length, 'falharam; total', resultados.length)
await browser.close()
