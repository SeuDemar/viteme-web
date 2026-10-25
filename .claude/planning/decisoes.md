# Decisões do frontend

Prefixo **D-W** para não colidir com as decisões D01–D46 do backend.

| Cód. | Decisão | Motivo / impacto |
|---|---|---|
| D-W01 | Stack: React + TypeScript + Vite, React Router, Axios, TanStack Query, React Hook Form + Zod, Vitest + RTL + MSW (PDF, Quadro 67). Playwright opcional | Definido na especificação |
| D-W02 | O **protótipo do Figma** ("Viteme — Protótipo Acadêmico, Desktop e Mobile") é a referência visual; o PDF é a referência funcional (rotas, endpoints, regras). Em conflito, vale o PDF para comportamento e o Figma para aparência | Equipe forneceu os dois. Design responsivo: desktop e mobile |
| D-W03 | **Não usar `SameSite=Strict` no cookie de refresh.** Frontend e API podem ficar em sites diferentes. Cookie passa a `HttpOnly; Secure; SameSite=None`, restrito a `/api/v1/auth` | Evita a exigência de mesmo domínio na hospedagem (resolve P8/P11 da API). **Mudança na API já feita (D47 no `viteme-api`)** e proteção contra CSRF em D-W04 |
| D-W04 | Como `SameSite=None` perde a proteção de CSRF do `Strict`, os endpoints que dependem só do cookie (E03 renovar, E04 logout) devem exigir **cabeçalho customizado** (ex.: `X-Requested-With: viteme-web`) e a API deve conferir `Origin` contra `Cors:OrigemFrontend`. O Axios envia o cabeçalho em todas as chamadas a `/auth/*` | Cabeçalho customizado força preflight de CORS, que só a origem permitida passa. Alternativa descartada: guardar refresh no storage (exposto a XSS) |
| D-W05 | Token de acesso **somente em memória** (nunca em `localStorage`/`sessionStorage`); sessão restaurada com E03 na inicialização (PDF, 4.1/5.6) | Reduz risco de roubo por XSS |
| D-W06 | Organização por funcionalidade: `src/api`, `src/features/*`, `src/components`, `src/schemas`, `src/routes` (PDF, 5.1) | Definido na especificação |
| D-W07 | Cliente HTTP e tipos gerados a partir do OpenAPI/Swagger da API (`/swagger`), com ajustes manuais onde o contrato não bastar | Reduz erro de integração (ver `viteme-api/.claude/planning/entrega-3.md`, seção 4). Se a geração atrapalhar, tipos escritos à mão em `src/api/tipos.ts` |
| D-W08 | Validação no frontend é conveniência: a API sempre revalida. Mensagens 400 por campo vêm de `errors` do ProblemDetails; 409/422 mostram `detail` | PDF, 5.5 e 5.6 |
| D-W09 | Pagamento e SMS seguem **stub** na demonstração; o frontend trata o pagamento como "redireciona à `urlPagamento` e depois consulta E30". Com o stub, haverá uma forma de simular a aprovação (ver PW5) | Alinhado com o backend (entrega-3.md, seção 8) |
| D-W10 | Textos da interface em **português do Brasil**; datas exibidas no fuso do navegador (a API devolve UTC) e valores em BRL (`Intl.NumberFormat`) | API usa ISO 8601 UTC |
| D-W11 | Acessibilidade mínima: rótulos em todos os campos, foco visível, navegação por teclado, contraste adequado, `aria-live` para erros e avisos | Banca e usabilidade |
| D-W12 | Branch por funcionalidade + PR com revisão, e cada integrante commita com o próprio nome/e-mail (exigência de participação da Entrega 3) | Ver `entrega-3.md` do backend, seção 6 |

## Pontos em aberto

1. **Hospedagem** do frontend (Vercel, Netlify, GitHub Pages, outra) e URL da API na demonstração. Com D-W03 não precisa ser o mesmo site, mas precisa ser HTTPS para o cookie `Secure`.
2. **Biblioteca de UI**: Tailwind, CSS Modules, MUI, shadcn/ui? Escolher depois de ver o Figma (PW1), para acompanhar o estilo do protótipo.
3. **Cliente gerado do OpenAPI** (D-W07): qual gerador (`openapi-typescript`, `orval`). Decidir na etapa W0.
4. **Imagem do evento (T10)**: a API aceita upload ou apenas URL? Conferir em `E12` antes de implementar o campo.
5. **Playwright** (ponta a ponta opcional): fazer ou não, conforme o tempo.
