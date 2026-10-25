# Hospedagem: Cloudflare (frontend) + API em outro serviço

## Como funciona

```
Navegador ──► https://viteme-web.<conta>.workers.dev ──┬─► arquivos do site (HTML, JS, CSS)
                                                        └─► /api/*  ──(repasse do Worker)──►  API (Render, Azure…)  ──►  Supabase
```

O frontend vai para um **Cloudflare Worker com arquivos estáticos** (projeto `viteme-web`, configurado em `wrangler.jsonc`). Um pequeno código (`worker/index.ts`) repassa tudo que começa com `/api/` para a API. Para o navegador, site e API têm o **mesmo endereço**. Isso evita dois problemas, sem precisar de domínio próprio:

- **Cookie de sessão:** o cookie de renovação passa a ser de primeiro nível. Sem o repasse, site (`*.workers.dev`) e API ficariam em sites diferentes e navegadores com bloqueio de cookies de terceiros (Safari, Firefox estrito, Chrome) poderiam não enviá-lo, e o F5 desconectaria o usuário (pendência PW2).
- **CORS:** deixa de ser necessário no dia a dia.

Também no Worker: `public/_headers` aplica uma **Content-Security-Policy** e outros cabeçalhos de segurança ao site (pendência de CSP da W6).

> O código de repasse e os cabeçalhos foram testados localmente (`wrangler dev`) contra a API real: o roteiro `npm run e2e` passou **39 de 39** passos pelo Worker, sem violações de CSP ([evidência](evidencias/e2e-via-worker-cloudflare-2026-10-25.txt)). **Não foram testados em produção** (conta real da Cloudflare, API hospedada, HTTPS).

## Ordem sugerida (o endereço do site só existe depois do primeiro deploy)

1. **Banco:** projeto no Supabase e esquema aplicado (veja o `docs/deploy.md` da API).
2. **Frontend, primeiro deploy** (com um `API_ORIGIN` provisório): anote o endereço que a Cloudflare mostrar, algo como `https://viteme-web.<sua-conta>.workers.dev`.
3. **API:** publique com `Cors__OrigemFrontend` igual a esse endereço (sem barra final).
4. **Frontend, ajuste final:** troque `API_ORIGIN` pelo endereço da API e faça o deploy de novo.
5. Teste a sessão: entre, aperte F5 e confira que continua logado.

## Frontend na Cloudflare

Pela linha de comando:

```bash
npm ci
npx wrangler login
# edite "API_ORIGIN" em wrangler.jsonc (ou defina a variável no painel do Worker)
VITE_SIMULADOR_PAGAMENTO=true npm run cf:deploy     # "true" só para a demonstração
```

Ou pela integração com o GitHub (Workers Builds, no painel da Cloudflare): conecte o repositório e use

| Campo | Valor |
|---|---|
| Comando de build | `npm ci && npm run build` |
| Comando de deploy | `npx wrangler deploy` |
| Variável de build | `VITE_SIMULADOR_PAGAMENTO=true` (somente para a demonstração; **é lida na hora do build**) |

Os nomes exatos dos campos no painel podem mudar; confira a documentação atual da Cloudflare.

Teste local do mesmo arranjo: `npm run cf:dev` (sobe em `http://localhost:8787`; passe a API com `--var API_ORIGIN:http://localhost:5092`).

## Configuração da API (variáveis de ambiente)

| Variável | Valor |
|---|---|
| `Cors__OrigemFrontend` | O endereço do site na Cloudflare (**exatamente** como aparece no navegador, sem barra final). A API compara com o cabeçalho `Origin` nas chamadas de renovar/logout |
| `Proxy__ConfiarEmCabecalhosEncaminhados` | `true`: o Worker envia o IP real do visitante em `X-Forwarded-For` e o limite de requisições por IP depende disso |
| `ConnectionStrings__Default` | Conexão do Supabase (use a direta ou o *session pooler*, porta 5432; ver `docs/deploy.md` da API) |
| `Jwt__Chave` | Chave secreta de pelo menos 32 caracteres |
| `Gateway__Stub__HabilitarSimulador` | `true` **só na demonstração** (habilita os botões de pagamento simulado) |
| `Certificados__UrlValidacao` | `https://<endereço do site>/certificados`, impresso no PDF do certificado |
| `Swagger__Habilitar` | `true` se quiser mostrar a documentação da API |

## Escolha do serviço da API (decisão pendente)

| | Render | Azure App Service |
|---|---|---|
| .NET | Em geral só com **Docker** (a API não tem Dockerfile, por decisão anterior da equipe; posso escrever um) | Suporte nativo a .NET |
| Plano gratuito | Costuma "dormir" depois de um tempo parado e leva até cerca de um minuto para acordar | Plano gratuito (F1) tem cotas de CPU por dia e também "dorme" sem uso |
| Pontos de atenção | Confira se o .NET 10 está disponível na imagem escolhida | Confira se o .NET 10 está disponível no plano gratuito |

Estas observações vêm do que sei dos serviços; **confirme os limites e versões atuais** antes de decidir.

**Antes da apresentação:** abra o endereço da API (`/api/v1/saude`) uns minutos antes para ela acordar. Enquanto a API estiver acordando, o Worker devolve um erro 502 com a mensagem "API indisponível"; basta tentar de novo.

## Limites e cuidados

- **IP do visitante:** com `Proxy__ConfiarEmCabecalhosEncaminhados=true`, a API confia no `X-Forwarded-For` de qualquer origem. Quem acessar o endereço direto da API poderia forjar o cabeçalho e burlar o limite por IP. Aceitável para a demonstração; em produção, restrinja quem pode falar com a API.
- **Acesso direto à API:** o endereço da API continua público. Navegadores só conseguem usá-lo a partir do site configurado (CORS), mas ferramentas como `curl` não são impedidas.
- **Domínio próprio:** se um dia houver domínio, dá para usar `app.dominio.com` e `api.dominio.com` (mesmo site) e dispensar o repasse.
- **Teste de produção pendente:** HTTPS real, cookie `Secure; SameSite=None` passando pelo Worker, Safari e Firefox.
