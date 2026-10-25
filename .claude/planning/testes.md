# Testes do frontend

Fonte: PDF, seção 6 (Quadros 70, 71 e 80). Os casos CT01–CT57 são do backend (`viteme-api/.claude/planning/testes.md`); aqui ficam **CT58–CT63** e os casos adicionais do frontend (**CTW01…**).

## 1. Estratégia

| Nível | Ferramentas | Escopo |
|---|---|---|
| Unitário e componente | Vitest, React Testing Library, MSW | Formulários, validações, rotas protegidas, tratamento de erros e renovação de token |
| Ponta a ponta (opcional) | Playwright | Inscrição gratuita, criação e alteração de evento |

- A API é simulada com **MSW** (handlers em `src/test/`), com respostas no formato real (ProblemDetails com `codigo` e `errors`).
- Relógio controlado (`vi.useFakeTimers`) para polling (5 s, 60 s), contador de reenvio de 60 s e selo de 72 h.
- Gateway e SMS nunca são reais.

## 2. Casos do PDF (Quadro 80)

| ID | Cenário | Entrada / pré-condição | Resultado esperado | Tipo | RN | Tela |
|---|---|---|---|---|---|---|
| CT58 | Validação do formulário de cadastro | Senha sem número e e-mail inválido | Mensagens nos campos; requisição não enviada | Erro | RN02 | T04 |
| CT59 | Rota protegida | Visitante acessa `/minhas-inscricoes` | Redireciona para o login e volta à rota após autenticar | Sucesso | — | T03, T05 |
| CT60 | Renovação automática do token | Token de acesso expirado durante o uso | Interceptor renova e repete a requisição sem perder a ação | Sucesso | — | Todas |
| CT61 | Erros da API nos campos | API retorna 400 com erros por campo | Mensagens exibidas nos campos correspondentes | Erro | — | T10 |
| CT62 | Destaque de alteração no mural | Evento alterado nas últimas 72 horas | Card exibe o selo "Alterado" | Sucesso | RN13 | T01 |
| CT63 | Recarregar a página logado | Usuário autenticado pressiona F5 | Frontend chama E03 ao iniciar e restaura a sessão sem novo login | Sucesso | — | Todas |

## 3. Casos adicionais propostos

Cobrem o restante dos fluxos e regras de interface. Numeração própria para não colidir com a do PDF.

| ID | Cenário | Resultado esperado | Tela | Prioridade |
|---|---|---|---|---|
| CTW01 | Login com credenciais erradas (401) | Mensagem genérica; botão reabilitado | T03 | Alta |
| CTW02 | Conta bloqueada (423) | Aviso de bloqueio temporário | T03 | Média |
| CTW03 | E-mail já cadastrado (409) | Erro no campo e-mail | T04 | Média |
| CTW04 | Inscrição gratuita | Mostra confirmação com código de check-in e vai a T05 | T02, T05 | Alta |
| CTW05 | Inscrição sem login | Vai a T03 e volta ao evento | T02, T03 | Alta |
| CTW06 | Inscrição paga | Vai a T06 com valor e prazo; redireciona à `urlPagamento` | T02, T06 | Alta |
| CTW07 | Polling do pagamento | Consulta E30 a cada 5 s; para ao aprovar ou após 2 min | T06 | Alta |
| CTW08 | Evento lotado / inscrições encerradas | Botão desabilitado com motivo | T02 | Média |
| CTW09 | Organizador vê o próprio evento | Sem botão de inscrição | T02 | Média |
| CTW10 | Cancelar inscrição | Confirmação; mostra estorno solicitado; trata `PRAZO_CANCELAMENTO_ENCERRADO` | T05 | Alta |
| CTW11 | Certificado disponível / indisponível | Botão só quando `certificadoDisponivel`; baixa PDF | T05 | Média |
| CTW12 | Sino de notificações | Mostra `naoLidas`; atualiza a cada 60 s e ao voltar o foco | Cabeçalho | Média |
| CTW13 | Marcar notificações como lidas | Uma e todas; contador atualiza | T07 | Média |
| CTW14 | Verificação de telefone | Contador de 60 s no reenvio; erros de código | T08 | Média |
| CTW15 | Aceite de SMS sem telefone verificado | Opção desabilitada | T08 | Média |
| CTW16 | Motivo da alteração | Campo aparece só em evento publicado com campo relevante alterado; exige 10–300 caracteres | T10 | Alta |
| CTW17 | Edição concorrente (412) | Oferece recarregar sem perder o digitado | T10 | Média |
| CTW18 | Colaborador na gestão | Vê Inscritos e Check-in; abas de organizador ocultas | T11 | Alta |
| CTW19 | Check-in | Código em maiúsculas, 12 caracteres; trata `CHECKIN_JA_REALIZADO` e fora do horário | T11 | Alta |
| CTW20 | Cancelar evento | Motivo + confirmação antes de enviar | T11 | Média |
| CTW21 | Denunciar evento | Descrição obrigatória para "Outro"; trata `DENUNCIA_EXISTENTE` | T02 | Média |
| CTW22 | Validar certificado público | Sem login; válido e 404 | T12 | Média |
| CTW23 | Falha na renovação do token | Sessão limpa e redirecionamento ao login | Todas | Alta |
| CTW24 | Erros 429, 500 e de rede | Mensagem adequada e "Tentar novamente" | Todas | Baixa |
| CTW25 | Estados de consulta | Carregando, vazio e erro em T01, T05, T07, T09 | Várias | Média |

## 4. Rastreabilidade (frontend)

| Regra / requisito | Telas | Casos |
|---|---|---|
| RN02 (senha) | T04 | CT58 |
| RN03 (bloqueio de login) | T03 | CTW01, CTW02 |
| RN08–RN11 (inscrição e pagamento) | T02, T05, T06 | CTW04–CTW08 |
| RN13 (alteração e selo) | T01, T10 | CT62, CTW16 |
| RN15 (cancelamento de inscrição) | T05 | CTW10 |
| RN16 (notificações) | T07, sino | CTW12, CTW13 |
| RN18 (telefone e SMS) | T08 | CTW14, CTW15 |
| RN19 (denúncia) | T02 | CTW21 |
| RN20 (check-in) | T11 | CTW19 |
| RN21 (certificado) | T05, T12 | CTW11, CTW22 |
| Rotas protegidas | T03, T05 | CT59 |
| Sessão e token | Todas | CT60, CT63, CTW23 |
| Erros da API | T10 e demais | CT61, CTW24 |

## 5. Critérios de aceite
a) Todos os casos de **prioridade alta** passando antes de cada entrega.
b) CT58–CT63 passando e registrados em [testes-execucao.md](testes-execucao.md).
c) Testes executados automaticamente a cada envio ao repositório (CI) e bloqueando a integração quando falham.
d) Lint (`eslint`) e checagem de tipos (`tsc --noEmit`) sem erros no CI.
e) Este plano é uma primeira versão e será atualizado conforme a implementação avançar.
