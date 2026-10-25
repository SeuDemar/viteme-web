# Arquitetura do frontend

## 1. Visão geral

SPA em React que consome a API REST (ASP.NET Core) por HTTPS + JSON. Fluxo de dados:

```
Páginas e componentes (React Router) → hooks e cache (TanStack Query) → cliente HTTP (Axios + JWT) → API /api/v1
```

Não há regra de negócio no frontend além de **conveniência de interface** (ocultar botões, validar formulários, avisar prazos). Toda regra é revalidada pela API (RN01–RN23).

## 2. Tecnologias

| Necessidade | Tecnologia |
|---|---|
| Base | React com TypeScript, criado com Vite |
| Rotas | React Router, com componente de rota protegida |
| API | Axios, cliente central e interceptors |
| Estado do servidor e cache | TanStack Query (consultas, mutações, invalidação) |
| Formulários e validação | React Hook Form + esquemas Zod espelhando a API |
| Testes | Vitest, React Testing Library, MSW |
| Ponta a ponta (opcional) | Playwright |
| Estilo | A definir após o Figma (ver [decisoes.md](decisoes.md), ponto em aberto 2) |

## 3. Estrutura de pastas

```
src/
  api/              cliente Axios, interceptors, funções por endpoint, tipos
  features/
    auth/           T03 Login, T04 Cadastro, contexto de sessão, useAuth
    eventos/        T01 Mural, T02 Detalhe, T12 Validar certificado, cards, filtros
    inscricoes/     T05 Minhas inscrições, T06 Pagamento
    gestao/         T09 Meus eventos, T10 Criar/editar, T11 Gestão do evento
    notificacoes/   T07 Notificações, sino do cabeçalho
    perfil/         T08 Perfil e SMS
  components/       EventoCard, SeloAlterado, SinoNotificacoes, Cabecalho, Estados (carregando/vazio/erro), Confirmacao
  schemas/          Zod: cadastro, login, evento, atividade, colaborador, checkin, cancelamento, denuncia, telefone
  routes/           definição das rotas e RotaProtegida
  lib/              formatadores (data, moeda, telefone E.164), mapeamento de erros
  test/             MSW (handlers), utilitários de render
```

Regra de dependência: `features` usa `api`, `components`, `schemas` e `lib`; `api` não importa de `features`.

## 4. Rotas e guardas

| Rota | Tela | Guarda |
|---|---|---|
| `/` | T01 | Pública |
| `/eventos/:id` | T02 | Pública |
| `/entrar` | T03 | Pública (se já logado, redireciona) |
| `/cadastro` | T04 | Pública |
| `/certificados/:codigo` | T12 | Pública |
| `/minhas-inscricoes` | T05 | Autenticado |
| `/inscricoes/:id/pagamento` | T06 | Autenticado |
| `/notificacoes` | T07 | Autenticado |
| `/perfil` | T08 | Autenticado |
| `/meus-eventos` | T09 | Autenticado |
| `/meus-eventos/novo` e `/meus-eventos/:id/editar` | T10 | Autenticado + organizador do evento (na edição) |
| `/meus-eventos/:id` | T11 | Autenticado + organizador ou colaborador do evento |

- **Rota protegida:** só decide depois de a restauração de sessão (E03) terminar; enquanto isso mostra carregando, para não redirecionar ao login por engano (PDF, 5.6 b).
- Sem login, redireciona a `/entrar` guardando a origem em `state`; após o login volta (CT59).
- Papel por evento (organizador/colaborador) **não vem no token**. T10/T11 consultam o evento e a API devolve 403/404 quando não há papel; a interface trata como "sem acesso".
- Rota desconhecida: página 404.

## 5. Componentes compartilhados

| Componente | Uso |
|---|---|
| `Cabecalho` | Menu fixo: Mural, Minhas inscrições, Meus eventos, sino, Perfil, Sair (E04). Versão mobile em menu recolhível |
| `EventoCard` | T01, T09 |
| `SeloAlterado` | Selo "Alterado" para evento alterado nas **últimas 72 horas** (CT62) |
| `SinoNotificacoes` | Contador de não lidas (E34 com `lidas=false`, a cada 60 s e ao voltar o foco) |
| `EstadoConsulta` | Carregando, lista vazia e erro com "Tentar novamente" (PDF, 5.6 e) |
| `ConfirmacaoDialog` | Cancelamentos e ações destrutivas |
| `CampoFormulario` | Rótulo + campo + mensagem de erro (cliente e API) |

## 6. Estados e cache (TanStack Query)

Chaves de consulta por recurso (`['eventos', filtros]`, `['evento', id]`, `['inscricoes','minhas', situacao]`, `['notificacoes', ...]`, `['perfil']`…). Após mutações, invalidar as consultas afetadas (PDF, 5.6 f):

| Mutação | Invalida |
|---|---|
| Inscrever (E24), cancelar inscrição (E26) | `evento`, `eventos`, `inscricoes/minhas` |
| Publicar/editar/cancelar evento (E13–E15) | `evento`, `eventos`, `meus-eventos`, `alteracoes` |
| Atividades (E18–E20) | `evento` |
| Colaboradores (E22/E23) | `colaboradores` |
| Check-in (E28) | `inscritos` |
| Interesse (E32/E33) | `evento` |
| Marcar lida (E35/E36) | `notificacoes` |
| Perfil/telefone/SMS (E06–E09) | `perfil` |

## 7. Variáveis de ambiente

| Variável | Uso |
|---|---|
| `VITE_API_URL` | URL base da API (ex.: `http://localhost:5000/api/v1`) |
| `VITE_POLL_PAGAMENTO_MS` / `VITE_POLL_SINO_MS` | (opcional) intervalos; padrões 5000 e 60000 |

Nenhum segredo vai no frontend.
