# Autenticação e sessão no frontend

Fonte: PDF, seções 4 e 5.6, e a decisão D-W03/D-W04 (sem `SameSite=Strict`).

## 1. Sessão
- **Login (E02):** o token de acesso (JWT, 15 min) vem no corpo e fica **em memória** (contexto/módulo). O token de renovação (7 dias) vai em cookie `HttpOnly; Secure`, restrito a `/api/v1/auth`, **inacessível ao JavaScript**.
- **Inicialização:** ao abrir ou recarregar o site, o frontend chama **E03**; só depois as rotas protegidas decidem se há usuário logado (evita redirecionar ao login por engano) — CT63.
- **Renovação automática:** 401 com token expirado → E03 uma vez → repete a requisição → se falhar, sessão encerrada e redirecionamento ao login (CT60). Renovações simultâneas compartilham a mesma promessa (single-flight).
- **Rotação:** cada E03 devolve novo par e revoga o refresh anterior. Reutilizar um refresh revogado revoga **todas** as sessões do usuário; o frontend trata esse 401 como logout.
- **Logout (E04):** chama a API, limpa token e cache do TanStack Query e vai a T01.
- Nunca guardar token em `localStorage`, `sessionStorage` ou na URL.

## 2. Cookie e domínios (D-W03, D-W04)
A especificação previa `SameSite=Strict` (frontend e API no mesmo site). A equipe decidiu **não usar** essa restrição:

| Item | Definição |
|---|---|
| Cookie de refresh | `HttpOnly; Secure; SameSite=None; Path=/api/v1/auth` |
| CORS da API | Origem do frontend **explícita** (`Cors:OrigemFrontend`, nunca `*`) com `AllowCredentials` |
| Axios | `withCredentials: true` em E02, E03, E04 |
| Proteção CSRF | E03 e E04 exigem o cabeçalho `X-Requested-With: viteme-web` (força preflight) e a API confere `Origin`; o frontend envia o cabeçalho nas chamadas a `/auth/*` |
| HTTPS | Obrigatório (cookie `Secure`); em desenvolvimento `localhost` é tratado como seguro pelos navegadores |

Observações:
- Navegadores com bloqueio de cookies de terceiros (Safari, Firefox estrito, Chrome com restrições) podem **não enviar** cookie `SameSite=None` entre sites diferentes. Se a demonstração rodar em domínios diferentes e a sessão não restaurar, a saída é hospedar frontend e API sob o mesmo domínio registrável (que também funciona com `None`) ou usar proxy reverso. Registrado em PW2.
- A mudança na API (cookie, cabeçalho e `Origin`) **já está feita** (D47 no `viteme-api`); ver [pendencias.md](pendencias.md), PW2. Sem o cabeçalho `X-Requested-With: viteme-web` ou com `Origin` diferente de `Cors__OrigemFrontend`, E03 e E04 respondem 403 `REQUISICAO_NAO_PERMITIDA`; o frontend deve tratar isso como erro de configuração, não como sessão expirada.
- **Várias abas:** reutilizar um refresh já revogado derruba todas as sessões do usuário (P40 da API), então a renovação deve ser feita por uma aba só e compartilhada com as outras (Web Locks ou `BroadcastChannel`); ver PW10.

## 3. Papéis na interface
O token **não contém papéis**; o papel depende do evento e é verificado pela API a cada requisição. A interface:
- decide o que mostrar a partir dos dados do evento (E11/E16: papel do usuário, se informado) e do usuário (`sub`);
- esconde ações sem permissão (inscrição para organizador/colaborador, abas de organizador para colaborador), **mas não confia nisso**: 403/404 da API sempre têm tratamento;
- trata 404 como "indisponível" também para rascunho e evento oculto de quem não pode ver.

Matriz (do PDF, Quadro 65) refletida na interface:

| Funcionalidade | Visitante | Participante | Colaborador | Organizador |
|---|---|---|---|---|
| Ver mural, detalhes e alterações de eventos publicados | Sim | Sim | Sim | Sim |
| Ver evento em rascunho | Não | Não | Sim | Sim |
| Ver evento oculto por denúncias | Não | Só se inscrito | Sim | Sim |
| Criar evento | Não | Sim | Sim | Sim |
| Inscrever-se, pagar, cancelar a própria inscrição | Não | Sim | Não | Não |
| Acompanhar evento e receber notificações | Não | Sim | Sim | Sim |
| Denunciar evento | Não | Sim | Não | Não |
| Baixar o próprio certificado | Não | Sim | Não | Não |
| Validar certificado | Sim | Sim | Sim | Sim |
| Ver inscritos e fazer check-in | Não | Não | Sim | Sim |
| Editar, publicar e cancelar o evento | Não | Não | Não | Sim |
| Gerenciar programação e colaboradores | Não | Não | Não | Sim |

O papel é **relativo ao evento**: a mesma pessoa pode ser organizadora de um evento e participante de outro.

## 4. Segurança no frontend
- React escapa o conteúdo; descrição do evento é texto puro (sem `dangerouslySetInnerHTML`).
- **Content-Security-Policy** na hospedagem do frontend (`default-src 'self'`; `connect-src` com a origem da API; `frame-ancestors 'none'`).
- Redirecionamento ao gateway só para a `urlPagamento` devolvida pela API.
- Não registrar token, código de SMS, senha nem telefone completo em logs/console.
- Telefone não é exibido a organizadores/colaboradores (a API não o devolve).
- Aceite de SMS e verificação de telefone seguem a LGPD descrita em T08.
