# Integração com a API

Prefixo `/api/v1`. Convenções do backend: `viteme-api/.claude/planning/api/convencoes-e-erros.md`. Endpoints: `.../api/endpoints.md`.

## 1. Cliente HTTP (Axios)

- Um único cliente define `baseURL` (`VITE_API_URL`), tempo limite e `Authorization: Bearer <token>` em todas as chamadas.
- `withCredentials: true` nas chamadas a `/auth/*` (E02, E03, E04), por causa do cookie de refresh (ver [autenticacao.md](autenticacao.md)).
- Interceptor de resposta: ao receber **401 com token expirado**, chama E03 **uma única vez** (as demais requisições em andamento aguardam a mesma renovação), repete a requisição original e, se a renovação falhar, limpa a sessão e leva ao login (CT60).
- JSON em `camelCase`; datas ISO 8601 UTC; paginação `{ itens, pagina, tamanhoPagina, total }`.
- Download de PDF (E38): `responseType: 'blob'`, usando o nome de `Content-Disposition`.
- Edição de evento (E13): enviar `If-Match` com o ETag lido em E11.

## 2. Tratamento de erros (ProblemDetails)

| Status | Tratamento na interface |
|---|---|
| 400 | `errors` por campo exibidos nos próprios campos do formulário (CT61) |
| 401 | Renovar token uma vez; se falhar, ir ao login. Em E02: "e-mail ou senha incorretos" (mensagem genérica) |
| 403 | "Você não tem acesso a esta área". Em E03/E04, `REQUISICAO_NAO_PERMITIDA` indica cabeçalho `X-Requested-With` ausente ou origem não configurada na API (erro de configuração) |
| 404 | "Não encontrado" (também para evento oculto/rascunho/recurso alheio) |
| 409, 422 | Mensagem com o texto de `detail`; ação conforme `codigo` (tabela abaixo) |
| 412 | `VERSAO_DESATUALIZADA`: oferecer recarregar o evento |
| 423 | `CONTA_BLOQUEADA`: informar bloqueio temporário (15 min) |
| 429 | "Muitas tentativas, aguarde um pouco" (e `AGUARDE_NOVO_CODIGO` no SMS) |
| 502 | `GATEWAY_INDISPONIVEL` / `SMS_INDISPONIVEL`: pedir para tentar novamente |
| 500 | "Algo deu errado" + `traceId` para suporte |
| Rede/timeout | Mensagem de conexão com "Tentar novamente" |

Função central `mapearErro(error)` devolve `{ status, codigo, mensagem, camposComErro }`; nenhuma tela interpreta o erro cru.

Códigos que mudam o comportamento da interface:

| `codigo` | Tela | Ação |
|---|---|---|
| `INSCRICAO_EXISTENTE` / `USUARIO_JA_INSCRITO` | T02 | Mostrar "já inscrito" e link para T05 |
| `SEM_VAGAS`, `INSCRICOES_ENCERRADAS`, `EVENTO_INDISPONIVEL` | T02 | Desabilitar inscrição e explicar |
| `PAPEL_NAO_PERMITE_INSCRICAO` | T02 | Ocultar botão para organizador/colaborador |
| `RESERVA_EXPIRADA` | T06 | Orientar nova inscrição |
| `PAGAMENTO_JA_APROVADO` | T06 | Ir a T05 |
| `PRAZO_CANCELAMENTO_ENCERRADO` | T05 | Informar prazo de 24 h |
| `CHECKIN_JA_REALIZADO`, `INSCRICAO_NAO_CONFIRMADA`, `FORA_DO_HORARIO_DE_CHECKIN`, `INSCRICAO_NAO_ENCONTRADA` | T11 | Mensagem no campo de check-in |
| `CERTIFICADO_INDISPONIVEL` | T05 | Explicar requisitos (presença, evento encerrado, carga horária) |
| `PRECO_BLOQUEADO`, `MOTIVO_OBRIGATORIO`, `CAPACIDADE_ABAIXO_DAS_VAGAS_OCUPADAS` | T10 | Erro no campo correspondente |
| `DATA_INICIO_PASSADA`, `DADOS_INCOMPLETOS` | T10 | Erro ao publicar |
| `CODIGO_INVALIDO`, `CODIGO_EXPIRADO`, `TENTATIVAS_EXCEDIDAS`, `TELEFONE_NAO_VERIFICADO` | T08 | Mensagem no campo/aceite |
| `EMAIL_JA_CADASTRADO` | T04 | Erro no campo e-mail |
| `JA_COLABORADOR`, `ORGANIZADOR_NAO_PODE_SER_COLABORADOR`, `USUARIO_NAO_ENCONTRADO` | T11 | Erro no campo e-mail |
| `DENUNCIA_EXISTENTE`, `NAO_PODE_DENUNCIAR_PROPRIO_EVENTO` | T02 | Mensagem no modal |
| `CERTIFICADO_NAO_ENCONTRADO` | T12 | "Certificado não encontrado" |

## 3. Mapa tela ↔ endpoint

| Endpoint | Tela(s) | Observação |
|---|---|---|
| E01 `POST /auth/cadastro` | T04 | |
| E02 `POST /auth/login` | T03 | Guarda `tokenAcesso` em memória; cookie definido pela API |
| E03 `POST /auth/renovar` | Inicialização, interceptor | Restaura sessão ao carregar a página (CT63) |
| E04 `POST /auth/logout` | Cabeçalho | |
| E05/E06 `GET/PUT /usuarios/me` | T08 | |
| E07/E08 `POST /usuarios/me/telefone/codigo`, `/verificar` | T08 | Contador de 60 s |
| E09 `PUT /usuarios/me/preferencias-sms` | T08 | |
| E40 `PUT /usuarios/me/cnpj` | T08 | CNPJ do organizador (RN24). E05 traz `podeOrganizar`, que T10 usa para liberar a criação |
| E10 `GET /eventos` | T01 | Filtros e paginação |
| E11 `GET /eventos/{id}` | T02, T10, T11 | Devolve ETag |
| E12 `POST /eventos` | T10 | |
| E13 `PUT /eventos/{id}` | T10 | `If-Match` |
| E14 `POST /eventos/{id}/publicar` | T10 | |
| E15 `POST /eventos/{id}/cancelar` | T11 | |
| E16 `GET /eventos/meus` | T09 | |
| E17 `GET /eventos/{id}/alteracoes` | T02, T11 | |
| E18–E20 atividades | T10 | |
| E21–E23 colaboradores | T11 | |
| E24 `POST /eventos/{id}/inscricoes` | T02 | |
| E25 `GET /inscricoes/minhas` | T05 | `situacao` |
| E26 `POST /inscricoes/{id}/cancelar` | T05 | |
| E27 `GET /eventos/{id}/inscricoes` | T11 | Sem telefone |
| E28 `POST /eventos/{id}/checkin` | T11 | |
| E29/E30 pagamento | T05, T06 | Polling de 5 s por até 2 min |
| E31 webhook | — | Só gateway ↔ API; o frontend não chama |
| E32/E33 interesse | T02 | |
| E34–E36 notificações | T07, sino | Sino: 60 s e foco da aba |
| E37 denúncia | T02 | |
| E38 certificado (PDF) | T05 | |
| E39 validação | T12 | Público |

## 4. Atualização de dados
- **Polling** só em dois lugares: sino (60 s + `visibilitychange`/`focus`) e T06 (5 s, máx. 2 min). Parar o polling ao sair da tela.
- Demais telas atualizam por **invalidação** após mutações (tabela em [arquitetura.md](arquitetura.md), seção 6).
- Idempotência: E32, E33 retornam 204 mesmo se repetidos; botões não precisam tratar "já feito".
