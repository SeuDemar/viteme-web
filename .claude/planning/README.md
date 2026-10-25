# Viteme Web — Planejamento

Base: *Especificação Técnica Viteme* (Uniceve, Engenharia de Software, Maringá/PR, 2026 — Vitor Boer, Vitor Antonio, Luiz Ricardo; Prof. Fabricio), seção 5 (frontend) e seção 6 (testes), mais as decisões tomadas na conversa de planejamento e o protótipo do Figma (ver [decisoes.md](decisoes.md), D-W02).

Este repositório contém **o frontend** (`viteme-web`, React + TypeScript). A API está em `SeuDemar/viteme-api` e **já está implementada** (E01–E39, 281 testes). O planejamento do backend, que serve de modelo para esta pasta, fica em `viteme-api/.claude/planning/`.

## Índice

| Arquivo | Conteúdo |
|---|---|
| [decisoes.md](decisoes.md) | Decisões da equipe, desvios em relação ao PDF e pontos em aberto |
| [arquitetura.md](arquitetura.md) | Tecnologias, estrutura de pastas, camadas, rotas e guardas |
| [telas.md](telas.md) | T01–T12: rota, acesso, endpoints, estados e vínculo com o Figma |
| [fluxos.md](fluxos.md) | Fluxos principais (inscrição, pagamento, evento, check-in, SMS) |
| [formularios.md](formularios.md) | Formulários e validações Zod (espelham a API) |
| [integracao-api.md](integracao-api.md) | Cliente HTTP, mapa tela ↔ E01–E39, tratamento de ProblemDetails, cache, polling |
| [autenticacao.md](autenticacao.md) | Sessão, token em memória, refresh, CORS/cookie, papéis na interface |
| [testes.md](testes.md) | Estratégia e casos CT58–CT63, mais os casos adicionais do frontend |
| [roadmap.md](roadmap.md) | Etapas do frontend e definição de pronto |
| [pendencias.md](pendencias.md) | Pendências (inclusive mudanças necessárias na API) |
| [bugs.md](bugs.md) | Registro de bugs e correções |
| [testes-execucao.md](testes-execucao.md) | Registro de execução dos testes |

## Resumo em um parágrafo

SPA em **React + TypeScript (Vite)** que consome a API REST do Viteme em `/api/v1`. Rotas com **React Router** e rota protegida, **Axios** com cliente central e interceptors (token de acesso em memória, renovação automática), **TanStack Query** para consultas e mutações, **React Hook Form + Zod** nos formulários (mesmos limites da API) e testes com **Vitest, React Testing Library e MSW**. 12 telas (T01–T12) para visitante, participante, organizador e colaborador; o papel é **por evento**, então a interface decide o que mostrar a partir dos dados do evento, e a API continua sendo a autoridade.

## Estado atual

- Planejamento do frontend escrito a partir do PDF (seções 5 e 6) e da API implementada.
- **Pendente:** conferir cada tela com o protótipo do Figma (não acessível pela sessão de planejamento; ver [pendencias.md](pendencias.md), PW1).
- Código: ainda não iniciado. Próximo passo: etapa W0 do [roadmap.md](roadmap.md).
