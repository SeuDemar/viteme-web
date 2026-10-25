# Roadmap do frontend

Correspondência com o backend: este roadmap detalha a **Etapa 7** (frontend) e contribui para a **Etapa 8** (fechamento da Entrega 3) do `viteme-api/.claude/planning/roadmap.md`.

Convenções: branch por funcionalidade + PR com revisão; commits pequenos com o nome/e-mail de cada integrante; registrar testes e bugs **durante** o desenvolvimento.

## W0 — Fundação
- Projeto Vite + React + TypeScript, ESLint, Prettier, Vitest, MSW, CI (lint, tipos, testes, build).
- Escolha da biblioteca de UI e tokens de design a partir do Figma.
- Cliente Axios, `mapearErro`, tipos/cliente a partir do OpenAPI, roteamento, layout com `Cabecalho` responsivo, página 404.
- **Pronto quando:** `npm run build`, `lint` e `test` passam no CI; app abre no Mural vazio.

## W1 — Autenticação e sessão (T03, T04)
- Contexto de sessão, E01–E04, restauração por E03 na inicialização, interceptor com renovação, `RotaProtegida`, volta à origem após login.
- **Casos:** CT58, CT59, CT60, CT63, CTW01–CTW03, CTW23.
- **Pronto quando:** cadastro → login → logout funcionam contra a API local; F5 mantém a sessão.

## W2 — Mural e detalhe (T01, T02, T12)
- Listagem com busca, filtros e paginação; selo "Alterado"; detalhe com programação e histórico; validação pública de certificado.
- **Casos:** CT62, CTW08, CTW09, CTW22, CTW25.

## W3 — Inscrições e pagamento (T05, T06)
- Inscrição gratuita e paga, minhas inscrições, cancelamento, polling de pagamento, download de certificado.
- **Casos:** CTW04–CTW07, CTW10, CTW11.
- **Pronto quando:** fluxos 1 e 2 de [fluxos.md](fluxos.md) completos (pagamento via stub).

## W4 — Notificações e perfil (T07, T08)
- Sino com polling de 60 s, lista, marcar como lida; perfil, verificação de telefone e aceite de SMS.
- **Casos:** CTW12–CTW15.

## W5 — Gestão de eventos (T09, T10, T11)
- Meus eventos, criação/edição com programação, motivo de alteração, `If-Match`, publicação, inscritos, check-in, colaboradores, alterações, cancelamento; interesse e denúncia em T02.
- **Casos:** CT61, CTW16–CTW21.
- **Pronto quando:** fluxos 3, 4 e 5 completos.

## W6 — Fechamento (Entrega 3)
- Rodar **todos** os testes e preencher [testes-execucao.md](testes-execucao.md); [bugs.md](bugs.md) completo.
- (Opcional) Playwright: inscrição gratuita, criação e alteração de evento.
- Responsividade e acessibilidade conferidas contra o Figma; CSP configurada na hospedagem.
- README completo (descrição, como executar, tecnologias, estrutura, ambiente, uso) e `docs/` com o guia de uso e roteiro de demonstração.
- Publicação do frontend e checagem do cookie de sessão no ambiente da demonstração.
- Conferir os requisitos de frontend em `entrega-3.md` do backend: navegação, formulários, validações, consumo dos endpoints, exibição, tratamento de erros e fluxo completo.

## Dependências na API
Antes de W1 funcionar fora do `localhost`, a API precisa da mudança de cookie/CSRF (PW2). Para W3 na demonstração, definir como simular o pagamento (PW5).
