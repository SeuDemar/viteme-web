# Hospedagem: Cloudflare Pages (frontend) + API em outro serviço

## Como funciona

```
Navegador ──► https://viteme-web.pages.dev ──┬─► arquivos do site (HTML, JS, CSS)
                                              └─► /api/*  ──(Function do Pages)──►  API (Render, Azure…)  ──►  Supabase
```

O frontend é publicado no **Cloudflare Pages** (projeto `viteme-web`, configurado em `wrangler.jsonc`). Uma **Function** (`functions/api/[[path]].ts`, que usa `edge/proxy.ts`) repassa tudo que começa com `/api/` para a API. Para o navegador, site e API têm o **mesmo endereço**. Isso evita dois problemas, sem precisar de domínio próprio:

- **Cookie de sessão:** o cookie de renovação passa a ser de primeiro nível. Sem o repasse, site (`*.pages.dev`) e API ficariam em sites diferentes e navegadores com bloqueio de cookies de terceiros (Safari, Firefox estrito, Chrome) poderiam não enviá-lo, e o F5 desconectaria o usuário (pendência PW2).
- **CORS:** deixa de ser necessário no dia a dia.

Também: `public/_headers` aplica uma **Content-Security-Policy** e outros cabeçalhos de segurança ao site. As rotas do React (`/eventos/123`, `/minhas-inscricoes`…) funcionam ao recarregar porque o Pages trata o projeto como SPA quando não existe um `404.html` (comportamento documentado do Pages; confirme na documentação atual).

> O código de repasse e os cabeçalhos foram testados localmente (`wrangler pages dev`) contra a API real e o banco: o roteiro `npm run e2e` passou **39 de 39** passos pelo Pages local, sem violações de CSP ([evidência](evidencias/e2e-via-cloudflare-pages-2026-10-25.txt)). **Não foram testados em produção** (conta real da Cloudflare, API hospedada, HTTPS).

## Ordem sugerida (o endereço do site só existe depois do primeiro deploy)

1. **Banco:** projeto no Supabase e esquema aplicado (veja o `docs/deploy.md` da API).
2. **Frontend, primeiro deploy** (com um `API_ORIGIN` provisório): anote o endereço que a Cloudflare mostrar, em geral `https://viteme-web.pages.dev` (se o nome já existir, a Cloudflare acrescenta um sufixo).
3. **API:** publique com `Cors__OrigemFrontend` igual a esse endereço (sem barra final).
4. **Frontend, ajuste final:** troque `API_ORIGIN` em `wrangler.jsonc` pelo endereço da API e faça o deploy de novo.
5. Teste a sessão: entre, aperte F5 e confira que continua logado.

## Frontend no Cloudflare Pages

**Pela integração com o GitHub** (painel da Cloudflare: *Workers & Pages > Create > Pages > Connect to Git*):

| Campo | Valor |
|---|---|
| Repositório | `SeuDemar/viteme-web`, branch de produção (a que contém o código final) |
| Comando de build | `npm run build` |
| Pasta de saída | `dist` |
| Variáveis de build | `VITE_SIMULADOR_PAGAMENTO=true` (somente para a demonstração; **é lida na hora do build**) e `NODE_VERSION=22` |

**Pela linha de comando:**

```bash
npm ci
npx wrangler login
VITE_SIMULADOR_PAGAMENTO=true npm run cf:deploy     # "true" só para a demonstração
```

O endereço da API (`API_ORIGIN`) fica em `wrangler.jsonc`. Como esse arquivo define a configuração do projeto, o painel pode não permitir editar a variável por lá; o caminho é alterar o arquivo e fazer commit. **Passo a passo completo, incluindo Supabase e Azure:** [passo-a-passo-publicacao.md](passo-a-passo-publicacao.md).

Os nomes exatos dos campos do painel mudam com o tempo: confira a documentação atual da Cloudflare.

Atenção: os **deploys de pré-visualização** de outras branches têm endereços diferentes (algo como `abc123.viteme-web.pages.dev`). A API só aceita o endereço configurado em `Cors__OrigemFrontend`, então use o endereço de produção na demonstração.

Teste local do mesmo arranjo: `npm run cf:dev` (sobe em `http://localhost:8787`). Para apontar para uma API local, acrescente `--binding API_ORIGIN=http://localhost:5092` ao comando do `wrangler pages dev`.

## Configuração da API (variáveis de ambiente)

| Variável | Valor |
|---|---|
| `Cors__OrigemFrontend` | O endereço do site no Pages (**exatamente** como aparece no navegador, sem barra final). A API compara com o cabeçalho `Origin` nas chamadas de renovar/logout |
| `Proxy__ConfiarEmCabecalhosEncaminhados` | `true`: a Function envia o IP real do visitante em `X-Forwarded-For` e o limite de requisições por IP depende disso |
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

**Antes da apresentação:** abra o endereço da API (`/api/v1/saude`) uns minutos antes para ela acordar. Enquanto a API estiver acordando, o repasse devolve um erro 502 com a mensagem "API indisponível"; basta tentar de novo.

## Limites e cuidados

- **Limites do plano gratuito da Cloudflare:** as Functions do Pages têm limite diário de requisições no plano gratuito (confira o valor atual). Para uma demonstração acadêmica é mais que suficiente.
- **IP do visitante:** com `Proxy__ConfiarEmCabecalhosEncaminhados=true`, a API confia no `X-Forwarded-For` de qualquer origem. Quem acessar o endereço direto da API poderia forjar o cabeçalho e burlar o limite por IP. Aceitável para a demonstração; em produção, restrinja quem pode falar com a API.
- **Acesso direto à API:** o endereço da API continua público. Navegadores só conseguem usá-lo a partir do site configurado (CORS), mas ferramentas como `curl` não são impedidas.
- **Domínio próprio:** se um dia houver domínio, dá para usar `app.dominio.com` e `api.dominio.com` (mesmo site) e dispensar o repasse.
- **Pages ou Workers:** a Cloudflare tem direcionado projetos novos para Workers; o Pages continua funcionando. Se for preciso migrar, a lógica de repasse (`edge/proxy.ts`) é a mesma e a mudança é pequena.
- **Teste de produção pendente:** HTTPS real, cookie `Secure; SameSite=None` passando pela Function, Safari e Firefox.
