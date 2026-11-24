# SEO e acesso por robôs (buscadores e IAs)

O site é um app de página única: o HTML estático só tem `<div id="root">`. Quem não executa JavaScript (a maioria dos robôs de IA e os geradores de prévia de links) não veria nada. Por isso, parte do trabalho é feita no servidor (Cloudflare Pages Functions) e parte no navegador.

## O que existe

| Peça | Onde | Para quê |
|---|---|---|
| `robots.txt` | `public/robots.txt` | Libera as páginas públicas e bloqueia `/api/` e a área logada. Aponta o sitemap. |
| `sitemap.xml` | `functions/sitemap.xml.ts` | Páginas públicas + todos os eventos publicados (lê a API, cache de 1 h). Sem API, sai só com as páginas fixas. |
| `llms.txt` | `public/llms.txt` | Resumo do site para assistentes de IA (formato llmstxt.org). |
| Página de cada evento | `functions/eventos/[id].ts` | Devolve o HTML do site já com título, descrição, Open Graph, `canonical`, JSON-LD `Event` (schema.org) e um resumo em `<noscript>`. Evento inexistente responde 404. |
| Página inicial | `functions/index.ts` | Igual, com JSON-LD `WebSite` (com busca) e `ItemList` e a lista dos próximos eventos em `<noscript>`. |
| Lógica pura | `edge/seo.ts` | Montagem das tags, escape e sitemap. Testada em `edge/seo.test.ts`. |
| Metatags no navegador | `useTitulo` em `src/lib/formulario.ts` | Título, descrição, `canonical`, `robots` e Open Graph a cada navegação; telas privadas saem com `noindex`. |
| `X-Robots-Tag` | `edge/proxy.ts` | Tudo que vem de `/api/` leva `noindex, nofollow`. |
| Imagem de compartilhamento | `public/og.png` (1200×630) | Prévia ao compartilhar o link. |

As Functions dependem da variável `API_ORIGIN` (a mesma do repasse da API). Se a API estiver fora do ar, elas servem o HTML normal do site; nada quebra.

## Segurança

Título, descrição e local dos eventos são escritos por usuários. Tudo que vai para o HTML passa por escape (`escaparHtml`), e o JSON-LD é escrito com `<`, `>` e `&` em escape unicode (`jsonParaScript`), para o texto não fechar a tag nem injetar script. Há testes com texto malicioso. A CSP (`script-src 'self'`) segue valendo; o JSON-LD é dado, não script executado.

## Decisões que ficam com a equipe

- **IAs liberadas.** O `robots.txt` não bloqueia nenhum robô de IA: a ideia é divulgar os eventos, e isso inclui buscas e assistentes. Para bloquear só o treinamento de modelos, acrescente grupos para `GPTBot`, `CCBot`, `Google-Extended`, `Applebot-Extended` etc. com `Disallow: /` (lembre que um grupo nomeado não herda as regras do `*`).
- **Endereço fixo em alguns arquivos.** `robots.txt` (linha `Sitemap:`), `llms.txt` e as tags Open Graph do `index.html` usam `https://viteme-web.pages.dev`, porque o padrão exige endereço absoluto. Se o site ganhar domínio próprio, troque nesses três lugares (as Functions e o hook já usam o endereço da requisição).
- **Cache.** As páginas geradas pelas Functions ficam 2 min no cache da borda (`s-maxage=120`); mudanças em um evento (título, preço) levam até esse tempo para aparecer para robôs.

## Como testar

- `npm test` cobre as funções puras, as Functions (com API simulada) e o hook.
- Emulador local do Cloudflare: `npm run build`, depois `wrangler pages dev dist --port 8787 --binding API_ORIGIN=<endereço da API>` e abra `/sitemap.xml` e `/eventos/<id>` (veja o código-fonte da página, não o DOM).
- Depois de publicar: envie `https://viteme-web.pages.dev/sitemap.xml` no Google Search Console e teste uma página de evento no [Teste de Resultados Ricos](https://search.google.com/test/rich-results).
