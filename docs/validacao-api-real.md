# Validação do frontend contra a API real

**Data:** 2026-10-25 · **Resultado:** 39 de 39 passos aprovados, em duas execuções seguidas (com dados novos a cada vez) · **Evidência:** [`evidencias/e2e-api-real-2026-10-25.txt`](evidencias/e2e-api-real-2026-10-25.txt)

O roteiro `e2e/validacao-api-real.mjs` guia um Chromium de verdade pelo frontend em desenvolvimento, falando com a API ASP.NET Core real e um PostgreSQL 16 com o esquema de `viteme-api/docs/banco/schema.sql`. Usa dois usuários (organizador e participante) em contextos de navegador separados, mais um visitante.

## Ambiente usado

| Peça | Configuração |
|---|---|
| API | `dotnet run`, `ASPNETCORE_ENVIRONMENT=Development`, `http://localhost:5092`, `Cors__OrigemFrontend=http://localhost:5173`, `Gateway__Stub__HabilitarSimulador=true`, `Sms__LogarConteudo=true`, `RateLimiting__Habilitar=false` |
| Banco | PostgreSQL 16 local, banco `viteme_e2e`, criado com `docs/banco/schema.sql` |
| Frontend | `vite` em `http://localhost:5173` com `VITE_API_URL=http://localhost:5092/api/v1` e `VITE_SIMULADOR_PAGAMENTO=true` |
| Navegador | Chromium (Playwright) |

## Como repetir

```bash
# 1. banco e API (no repositório viteme-api)
createdb viteme_e2e && psql -d viteme_e2e -f docs/banco/schema.sql
ASPNETCORE_ENVIRONMENT=Development ASPNETCORE_URLS=http://localhost:5092 \
ConnectionStrings__Default="Host=localhost;Database=viteme_e2e;Username=postgres;Password=postgres" \
Jwt__Chave="uma-chave-de-teste-com-mais-de-32-caracteres" Cors__OrigemFrontend=http://localhost:5173 \
Gateway__Stub__HabilitarSimulador=true Sms__LogarConteudo=true RateLimiting__Habilitar=false \
dotnet run --project Viteme.Api --no-launch-profile > /tmp/api-e2e.log 2>&1 &

# 2. frontend (neste repositório)
VITE_API_URL=http://localhost:5092/api/v1 VITE_SIMULADOR_PAGAMENTO=true npm run dev &

# 3. roteiro (precisa do psql no PATH; veja as variáveis no cabeçalho do arquivo)
npm run e2e
```

## O que foi verificado

| Área | Passos |
|---|---|
| Sessão | Cadastro entra automaticamente; **F5 restaura a sessão** pelo cookie `HttpOnly; Secure; SameSite=None` e pelo cabeçalho `X-Requested-With`; logout remove o cookie e o F5 continua deslogado; rota protegida leva ao login e volta; senha errada mostra mensagem genérica; **três abas abrindo juntas** mantêm o login (Web Locks) |
| Eventos | Criar rascunho, adicionar atividade, publicar (E12, E18, E14); evento pago de R$ 25,00; editar evento publicado exige motivo (RN13) e usa `If-Match`; salvar de novo na mesma tela não dá 412; histórico de alterações (E17); cancelar evento com motivo cancela as inscrições (RN14) |
| Inscrição e pagamento | Mural e busca; filtros por categoria e "Gratuitos"; inscrição gratuita confirma e mostra o código de 12 caracteres; inscrição paga abre o pagamento; **simular aprovação** (webhook assinado) confirma e volta a Minhas inscrições; **simular recusa** permite tentar de novo; "Continuar pagamento"; cancelar com estorno solicitado |
| Gestão | Lista de inscritos sem telefone (minimização de dados); check-in com o código em minúsculas e erro ao repetir; presença na lista; colaborador inexistente e já inscrito geram erro |
| Notificações e perfil | Selo "Alterado" no mural e motivo no detalhe; sino com contador e "marcar todas como lidas"; **verificação do telefone com o código lido do log do SMS simulado** e ativação dos avisos (conferido no banco); salvar perfil; denúncia e denúncia repetida |
| Certificado | Evento encerrado (por SQL) libera o botão; o arquivo baixado é um PDF; um visitante valida o código em `/certificados/:codigo` e um código inexistente mostra "não encontrado" |
| Mobile | Viewport de 390 px: menu hambúrguer, barra de abas inferior e ausência de rolagem horizontal |

Console do navegador: somente os erros HTTP esperados (401 da restauração de um visitante, e 404/409/422 dos passos de erro); nenhum erro de JavaScript.

## Repetição pelo Worker da Cloudflare

O mesmo roteiro foi repetido com o frontend servido por `wrangler dev` em `http://localhost:8787`, que repassa `/api/*` para a API real (`Cors__OrigemFrontend=http://localhost:8787`, `Proxy__ConfiarEmCabecalhosEncaminhados=true`): **39 de 39**, com a política de segurança de conteúdo (CSP) ativa e **nenhuma violação** no console ([evidência](evidencias/e2e-via-worker-cloudflare-2026-10-25.txt)). Nesse arranjo o cookie de sessão é de primeiro nível. Veja [hospedagem-cloudflare.md](hospedagem-cloudflare.md). Uma repetição intermediária reprovou um passo por causa do limite da API de 5 códigos de SMS por hora por telefone (o roteiro reutilizava o mesmo número); o roteiro agora usa um telefone novo a cada execução.

## Bugs encontrados e corrigidos

| # | Bug | Causa | Correção |
|---|---|---|---|
| 1 | Ao salvar o perfil, a mensagem "Perfil atualizado." nunca aparecia | O formulário era remontado quando o cache do perfil mudava (`key` com nome e telefone), apagando o estado | `key` passa a ser só o id; teste de regressão em `fluxos.test.tsx` |
| 2 | Gestão mostrava "1 inscritos" | Plural fixo | "1 inscrito" / "N inscritos" |

Os testes automáticos com a API simulada (MSW) não pegaram o bug 1: ele só apareceu com o ciclo real de salvar e atualizar o cache.

## Limites desta validação (o que ela **não** prova)

- **Mesmo site:** frontend e API rodaram ambos em `localhost`, ou seja, no mesmo site. O cenário de **sites diferentes** com `SameSite=None` (e o bloqueio de cookies de terceiros de Safari, Firefox estrito e Chrome) **não** foi testado; a hospedagem escolhida (repasse pelo Worker) evita esse cenário. Segue como PW2 até confirmar em produção.
- **HTTP:** foi `http://localhost`, não HTTPS. O Chromium aceita cookies `Secure` em `localhost`; Safari não. Em produção é HTTPS.
- **Rate limiting desligado** para não atrapalhar o roteiro; os 429 não foram exercitados.
- **Gateway e SMS são simulados** (stubs da API), como previsto na Entrega 3. O pagamento real (Asaas) e um provedor de SMS não foram testados.
- **Evento encerrado por SQL:** o encerramento automático (tarefa em segundo plano, RN22) e a janela real de check-in não foram esperados; o roteiro atualiza as datas direto no banco para liberar o certificado.
- Só Chromium; não foram testados Firefox e Safari.
- A asserção do passo "participante já inscrito não pode ser colaborador" confere apenas que um alerta apareceu, não o texto.
- Os 25 casos CTW pendentes de [testes-execucao.md](../.claude/planning/testes-execucao.md) não viraram teste automatizado nesta etapa; vários foram exercitados aqui à mão pelo roteiro.
