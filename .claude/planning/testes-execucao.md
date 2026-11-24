# Registro de execução dos testes

Última execução: **2026-11-03**, `npm test` (Vitest 5, React Testing Library, MSW 3, jsdom): **81 testes em 6 arquivos, todos passando** (+10 dos pedidos de 2026-11-03, em `novidades.test.tsx`; 6 testes antigos ajustados ao cabeçalho novo, aos toasts e ao CT62 revisto). Evidência: [`docs/evidencias/vitest-2026-11-03.txt`](../../docs/evidencias/vitest-2026-11-03.txt). Anterior (71 testes): [`vitest-2026-10-28.txt`](../../docs/evidencias/vitest-2026-10-28.txt). Execução anterior (64 testes): [`vitest-2026-10-25.txt`](../../docs/evidencias/vitest-2026-10-25.txt). Lint (`eslint`), tipos (`tsc --noEmit`) e build (`vite build`) também passam. MSW roda com `onUnhandledFrame: 'error'`: qualquer chamada sem handler reprova o teste.

## Casos do PDF (CT58–CT63)

| ID | Cenário | Resultado | Data | Evidência | Observações |
|---|---|---|---|---|---|
| CT58 | Validação do formulário de cadastro | Passou | 2026-10-25 | `casos-frontend.test.tsx` | Mensagens nos campos; nenhuma requisição enviada |
| CT59 | Rota protegida | Passou | 2026-10-25 | `casos-frontend.test.tsx` | Vai a `/entrar` e volta a `/minhas-inscricoes` |
| CT60 | Renovação automática do token | Passou | 2026-10-25 | `casos-frontend.test.tsx` | Dois testes: renova e repete; falha na renovação leva ao login |
| CT61 | Erros da API nos campos | Passou | 2026-10-25 | `casos-frontend.test.tsx` | 400 com `errors` por campo no formulário de evento |
| CT62 | Destaque de alteração | Passou | 2026-11-03 | `casos-frontend.test.tsx` | Revisto (D-W25): o card não mostra o selo; o detalhe mostra "Este evento foi alterado" |
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
| CTW11 | Certificado disponível/indisponível | Corrigido | `complementares.test.tsx`. Achou um bug: o erro da API no download (resposta em Blob) virava mensagem genérica; corrigido em `baixarCertificado`. O nome do PDF agora sai sem acentos |
| CTW14 | Verificação de telefone com contador de 60 s | Passou | Envio, reenvio bloqueado, confirmação, código errado no campo e 429 `AGUARDE_NOVO_CODIGO` |
| CTW20 | Cancelar evento | Passou | Motivo validado no cliente; corpo enviado; seção some após cancelar |
| CTW21 | Denunciar evento | Passou | Motivo obrigatório, descrição obrigatória em "Outro", 409 de denúncia repetida |
| CTW24 | Erros 429, 500 e de rede | Passou | 500 com "Tentar novamente", falha de rede e 429 no login |
| CTW25 | Estados carregando/vazio/erro | Passou | Carregando → vazio no mural; vazio em Minhas inscrições; limite de erro (tela que falha não deixa a página em branco) |
| CTW26 | Criar evento sem CNPJ | Passou | `fluxos.test.tsx`; também no roteiro com a API real |
| CTW27 | Cadastrar CNPJ | Passou | Corpo enviado com máscara; razão social e selo "CNPJ verificado" |
| CTW28 | CNPJ com dígito errado | Passou | Nenhuma requisição enviada |
| CTW29 | CNPJ inativo (422) | Passou | Texto da API no alerta; selo continua "Sem CNPJ" |
| CTW30 | Publicar sem CNPJ (403) | Passou | Mensagem `CNPJ_NAO_VERIFICADO` da API |
| CTW31 | Toast de sucesso | Passou | `novidades.test.tsx` |
| CTW32 | Menu da conta | Passou | Iniciais, "Meu perfil", Escape fecha |
| CTW33 | Linha do tempo | Passou | Ordem e horário (`<time>`) |
| CTW34 | Colaborador se inscreve | Passou | Organizador continua sem botão |
| CTW35 | Início no passado | Passou | No cliente e com o erro da API |
| CTW36 | QR no comprovante | Passou | Imagem SVG gerada no navegador |
| CTW37 | Check-in pela câmera | Passou | `BarcodeDetector` simulado no jsdom; com câmera e QR reais no roteiro com a API (jsqr) |

Total de testes automáticos: **64** (inclui os campos `inscricoesAbertas`, `capacidade` e `inscritos` da API, o teste de regressão do perfil e 8 testes do repasse de `/api/*` em `edge/proxy.test.ts`). Também há testes unitários de formatadores e do mapeamento de erros (`src/lib/lib.test.ts`) e um teste do menu mobile.

## Validação ponta a ponta com a API real

2026-11-03: **42 de 42 passos aprovados em duas execuções seguidas**, com o **check-in lido do QR code pela câmera** (outro Chromium com câmera falsa: um vídeo `.y4m` com o QR do participante, gerado por `e2e/camera-falsa.mjs`; decodificado pelo `jsqr`), inscrito que vira colaborador e é removido (D52), card sem o selo "Alterado" e o cabeçalho novo. Uma execução intermediária reprovou 2 passos: o passo "salvar de novo" aceitava o toast do salvamento anterior, que ainda estava na tela, e seguia antes de o segundo envio terminar; o roteiro agora confere o salvamento no banco. Evidência: [`docs/evidencias/e2e-api-real-2026-11-03.txt`](../../docs/evidencias/e2e-api-real-2026-11-03.txt).

2026-10-28: **41 de 41 passos aprovados**, agora com os passos do CNPJ do organizador (T10 sem CNPJ pede o cadastro; cadastro em T08 gravado no banco). A API rodou com `Cnpj__UsarStub=true` porque a sessão de desenvolvimento não alcança a BrasilAPI. Evidência: [`docs/evidencias/e2e-api-real-2026-10-28.txt`](../../docs/evidencias/e2e-api-real-2026-10-28.txt).

2026-10-25: **39 de 39 passos aprovados** (duas execuções seguidas) com Chromium, a API ASP.NET Core real e PostgreSQL 16. Cobre sessão com cookie `SameSite=None`, F5, três abas simultâneas, criação e publicação de evento, inscrição gratuita e paga (com webhook simulado), check-in, alteração com motivo, notificações, verificação de telefone por SMS simulado, certificado em PDF e validação pública, e o layout mobile. Detalhes, bugs achados e **limites** (mesmo site, HTTP, rate limiting desligado, gateway e SMS simulados) em [validacao-api-real.md](../../docs/validacao-api-real.md). Evidência: [`e2e-api-real-2026-10-25.txt`](../../docs/evidencias/e2e-api-real-2026-10-25.txt).

## Verificação visual
Capturas em Chromium (desktop 1280 px e mobile 390 px) com a API simulada, de todas as telas, conferidas contra o Figma. Não há captura automatizada no repositório.
