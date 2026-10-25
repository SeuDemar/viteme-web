# viteme-web

Frontend do **Viteme**: site que centraliza a divulgação, a inscrição e o acompanhamento dos eventos da faculdade, com avisos de alteração e sem taxa da plataforma.

SPA em **React + TypeScript (Vite)** que consome a API REST em [`SeuDemar/viteme-api`](https://github.com/SeuDemar/viteme-api) (ASP.NET Core, `/api/v1`). As telas seguem o protótipo do Figma (desktop e mobile) e a seção 5 da especificação técnica.

> **Estado:** as 12 telas (T01–T12) estão implementadas e foram validadas contra a API real em Chromium (39 passos, [relatório](docs/validacao-api-real.md)); 41 testes automáticos passando (inclui CT58–CT63). Pendências e decisões em [`.claude/planning/`](.claude/planning/README.md).

## Como executar

Requisitos: Node.js 22+ e a API rodando (veja o README do `viteme-api`).

```bash
npm install
cp .env.example .env      # ajuste VITE_API_URL
npm run dev               # http://localhost:5173
```

Na API, configure a origem do frontend para o CORS e para a proteção CSRF da sessão:

```bash
Cors__OrigemFrontend=http://localhost:5173
```

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Checa os tipos e gera `dist/` |
| `npm run preview` | Serve o build localmente |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest + React Testing Library + MSW |
| `npm run e2e` | Roteiro Playwright contra a API real (precisa de API, banco e `psql`; veja [validacao-api-real.md](docs/validacao-api-real.md)) |

### Variáveis de ambiente

| Variável | Uso |
|---|---|
| `VITE_API_URL` | URL base da API com o prefixo `/api/v1` |
| `VITE_SIMULADOR_PAGAMENTO` | `true` mostra, na tela de pagamento, os botões que aprovam ou recusam a cobrança do gateway simulado. **Só para demonstração**; exige `Gateway__Stub__HabilitarSimulador=true` na API |

### Publicação

O site vai para o **Cloudflare Pages**, com uma Function que repassa `/api/*` para a API (Render ou Azure), sem precisar de domínio próprio: veja [docs/hospedagem-cloudflare.md](docs/hospedagem-cloudflare.md). Comandos: `npm run cf:dev` (teste local) e `npm run cf:deploy`.

### Sessão e cookie

O token de acesso fica só em memória. O refresh token vai em cookie `HttpOnly; Secure; SameSite=None` definido pela API, então **a API precisa de HTTPS** em produção (Chrome e Firefox costumam aceitar cookies `Secure` também em `http://localhost`; Safari não). As chamadas a `/auth/*` enviam `withCredentials` e o cabeçalho `X-Requested-With: viteme-web`. Detalhes em [autenticacao.md](.claude/planning/autenticacao.md).

## Telas

| Cód. | Tela | Rota | Acesso |
|---|---|---|---|
| T01 | Mural de eventos | `/` | Público |
| T02 | Detalhe do evento | `/eventos/:id` | Público |
| T03 | Login | `/entrar` | Público |
| T04 | Cadastro | `/cadastro` | Público |
| T05 | Minhas inscrições | `/minhas-inscricoes` | Autenticado |
| T06 | Pagamento | `/inscricoes/:id/pagamento` | Autenticado |
| T07 | Notificações | `/notificacoes` | Autenticado |
| T08 | Perfil e SMS | `/perfil` | Autenticado |
| T09 | Meus eventos | `/meus-eventos` | Autenticado |
| T10 | Criar/editar evento | `/meus-eventos/novo`, `/meus-eventos/:id/editar` | Organizador |
| T11 | Gestão do evento | `/meus-eventos/:id` | Organizador ou colaborador |
| T12 | Validar certificado | `/certificados`, `/certificados/:codigo` | Público |

## Estrutura

```
src/
  api/          cliente Axios (token em memória, renovação automática) e funções por endpoint
  components/   Layout/Cabeçalho, EventoCard, Selo, Campo, Modal, Estados
  features/     auth, eventos, inscricoes, gestao, notificacoes, perfil (telas e hooks de cada área)
  lib/          formatadores, mapeamento de erros (ProblemDetails), categorias
  routes/       AppRoutes e RotaProtegida
  schemas/      esquemas Zod dos formulários (mesmos limites da API)
  styles/       tokens do Figma e estilos globais
  test/         MSW, fixtures e testes de CT58–CT63 e dos fluxos
```

## Tecnologias

React 19, TypeScript, Vite, React Router, Axios, TanStack Query, React Hook Form, Zod, Vitest, React Testing Library e MSW.

## Documentação

Planejamento em [`.claude/planning/`](.claude/planning/README.md) (decisões, arquitetura, telas, fluxos, formulários, integração com a API, autenticação, testes, roadmap e pendências). Evidência dos testes em [`docs/evidencias/`](docs/evidencias/). **Guia de uso e roteiro da demonstração:** [docs/guia-de-uso.md](docs/guia-de-uso.md). Validação com a API real: [docs/validacao-api-real.md](docs/validacao-api-real.md). Falta preencher no guia o endereço do sistema e as contas de demonstração, quando a hospedagem estiver definida.

## Autores

Vitor Boer, Vitor Antonio e Luiz Ricardo — Engenharia de Software, Uniceve (Maringá/PR), 2026. Prof. Fabricio.
