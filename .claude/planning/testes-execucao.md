# Registro de execução dos testes

Última execução: **2026-10-25**, `npm test` (Vitest 5, React Testing Library, MSW 3, jsdom): **41 testes em 3 arquivos, todos passando**. Evidência: [`docs/evidencias/vitest-2026-10-25.txt`](../../docs/evidencias/vitest-2026-10-25.txt). Lint (`eslint`), tipos (`tsc --noEmit`) e build (`vite build`) também passam. MSW roda com `onUnhandledFrame: 'error'`: qualquer chamada sem handler reprova o teste.

## Casos do PDF (CT58–CT63)

| ID | Cenário | Resultado | Data | Evidência | Observações |
|---|---|---|---|---|---|
| CT58 | Validação do formulário de cadastro | Passou | 2026-10-25 | `casos-frontend.test.tsx` | Mensagens nos campos; nenhuma requisição enviada |
| CT59 | Rota protegida | Passou | 2026-10-25 | `casos-frontend.test.tsx` | Vai a `/entrar` e volta a `/minhas-inscricoes` |
| CT60 | Renovação automática do token | Passou | 2026-10-25 | `casos-frontend.test.tsx` | Dois testes: renova e repete; falha na renovação leva ao login |
| CT61 | Erros da API nos campos | Passou | 2026-10-25 | `casos-frontend.test.tsx` | 400 com `errors` por campo no formulário de evento |
| CT62 | Destaque de alteração no mural | Passou | 2026-10-25 | `casos-frontend.test.tsx` | Selo "Alterado" só no card alterado |
| CT63 | Recarregar a página logado | Passou | 2026-10-25 | `casos-frontend.test.tsx` | E03 na inicialização; envia `X-Requested-With: viteme-web` |

## Casos adicionais (CTW)

| ID | Cenário | Resultado | Observações |
|---|---|---|---|
| CTW01 | Credenciais erradas (401) | Passou | Mensagem genérica; botão reabilitado |
| CTW02 | Conta bloqueada (423) | Passou | |
| CTW03 | E-mail já cadastrado (409) | Passou | Erro no campo e-mail |
| CTW04 | Inscrição gratuita | Passou | Mostra o código de check-in em T05 |
| CTW05 | Inscrição sem login | Passou | Vai a T03 e volta ao evento |
| CTW06 | Inscrição paga | Passou | Vai a T06 |
| CTW07 | Polling do pagamento | Passou | Consulta E30 até aprovar e leva a T05 |
| CTW08 | Evento lotado | Passou | Botão desabilitado com motivo |
| CTW09 | Organizador vê o próprio evento | Passou | Sem inscrição nem denúncia |
| CTW10 | Cancelar inscrição | Passou | Confirmação, estorno e `PRAZO_CANCELAMENTO_ENCERRADO` |
| CTW12 | Sino de notificações | Passou | Contador de não lidas (o polling de 60 s não é testado) |
| CTW13 | Marcar todas como lidas | Passou | |
| CTW15 | Aceite de SMS sem telefone verificado | Passou | |
| CTW16 | Motivo da alteração | Passou | Só em evento publicado com campo relevante alterado |
| CTW17 | Edição concorrente (412) | Passou | Envia `If-Match`; oferece recarregar |
| CTW18 | Colaborador na gestão | Passou | Sem cancelar nem gerenciar programação |
| CTW19 | Check-in | Passou | Maiúsculas, 12 caracteres, `CHECKIN_JA_REALIZADO` |
| CTW22 | Validar certificado público | Passou | Válido, 404 e navegação pelo formulário |
| CTW23 | Falha na renovação do token | Passou | Coberto pelo segundo teste de CT60 |
| CTW11 | Certificado disponível/indisponível | Pendente | Download de PDF não testado |
| CTW14 | Verificação de telefone com contador de 60 s | Pendente | |
| CTW20 | Cancelar evento | Pendente | |
| CTW21 | Denunciar evento | Pendente | |
| CTW24 | Erros 429, 500 e de rede | Parcial | `mapearErro` testado em `lib.test.ts`; falta teste de tela |
| CTW25 | Estados carregando/vazio/erro | Pendente | Verificados só visualmente |

Total de testes automáticos: **41** (com o teste de regressão do perfil). Também há testes unitários de formatadores e do mapeamento de erros (`src/lib/lib.test.ts`) e um teste do menu mobile.

## Validação ponta a ponta com a API real

2026-10-25: **39 de 39 passos aprovados** (duas execuções seguidas) com Chromium, a API ASP.NET Core real e PostgreSQL 16. Cobre sessão com cookie `SameSite=None`, F5, três abas simultâneas, criação e publicação de evento, inscrição gratuita e paga (com webhook simulado), check-in, alteração com motivo, notificações, verificação de telefone por SMS simulado, certificado em PDF e validação pública, e o layout mobile. Detalhes, bugs achados e **limites** (mesmo site, HTTP, rate limiting desligado, gateway e SMS simulados) em [validacao-api-real.md](../../docs/validacao-api-real.md). Evidência: [`e2e-api-real-2026-10-25.txt`](../../docs/evidencias/e2e-api-real-2026-10-25.txt).

## Verificação visual
Capturas em Chromium (desktop 1280 px e mobile 390 px) com a API simulada, de todas as telas, conferidas contra o Figma. Não há captura automatizada no repositório.
