# Passo a passo: publicar o Viteme (Supabase + Azure + Cloudflare)

Este roteiro leva o sistema do computador para a internet, **sem domínio próprio e sem gastar dinheiro**, usando só planos gratuitos. São três serviços:

| O quê | Onde | Para que |
|---|---|---|
| Banco de dados | **Supabase** | Guarda usuários, eventos, inscrições… |
| API (.NET) | **Azure App Service** (plano gratuito F1) | Regras de negócio e autenticação |
| Site (React) | **Cloudflare Pages** | Telas e repasse de `/api/*` para a API |

Ordem do roteiro: **1** Supabase → **2** conta Azure → **3** criar a API no Azure → **4** publicar a API → **5** Cloudflare → **6** ligar tudo → **7** testar → **8** preparar a demonstração → **9** desligar depois.

Tempo estimado: 2 a 3 horas na primeira vez, a maior parte esperando cadastros e verificações.

> **Aviso:** não consegui executar o Azure, o Supabase nem a Cloudflare a partir daqui. Os nomes de menus e botões abaixo vêm do que conheço desses serviços e **podem estar diferentes hoje**. O que foi testado de verdade: a API, o banco, o site e o repasse `/api/*`, funcionando juntos no computador (39 passos, ver [validacao-api-real.md](validacao-api-real.md)). Quando uma tela estiver diferente, procure a opção com o mesmo nome.

## Antes de começar: o que anotar

Vá preenchendo esta tabela durante o roteiro. Vários passos usam valores de passos anteriores.

| Valor | Onde nasce | Seu valor |
|---|---|---|
| Senha do banco | Passo 1 | |
| Texto de conexão do banco | Passo 1 | |
| Chave secreta da API (`Jwt__Chave`) | Passo 3 | |
| Nome do app no Azure | Passo 3 | `viteme-api` |
| Endereço da API (`https://…azurewebsites.net`) | Passo 3 | `https://viteme-api-f5f3f2b8eacdbehp.westus3-01.azurewebsites.net` |
| Endereço do site (`https://…pages.dev`) | Passo 5 | |

Você vai precisar também de: acesso de **administrador** aos repositórios `viteme-api` e `viteme-web` no GitHub (para criar segredos e conectar serviços) e, no computador, de um editor de texto.

---

## Passo 1: banco de dados no Supabase

1. Entre em <https://supabase.com> e crie uma conta (pode ser com o GitHub).
2. **New project**: nome `viteme`, escolha uma **senha forte para o banco** (anote!) e a região **mais próxima da API**. Como a API ficou em **West US 3** (Arizona), escolha **West US (North California)**: cada pedido ao site faz várias consultas ao banco, e com o banco em São Paulo cada consulta atravessaria o continente (a tela ficaria visivelmente lenta). Aguarde alguns minutos até o projeto ficar pronto.
3. Pegue o **texto de conexão**: no projeto, clique em **Connect** (ou *Project Settings > Database*) e copie a conexão do tipo **Session pooler** (porta **5432**). Ela tem este formato:

   ```
   Host=<endereço-do-pooler>.pooler.supabase.com;Port=5432;Database=postgres;Username=postgres.<id-do-projeto>;Password=<SUA-SENHA>;SSL Mode=Require;Trust Server Certificate=true
   ```

   Pontos importantes:
   - Use o **Session pooler (porta 5432)**, não o *Transaction pooler* (porta 6543): a API usa transações que ele não suporta.
   - Prefira o pooler à "Direct connection": a conexão direta do Supabase costuma usar apenas IPv6, e o Azure pode não conseguir alcançá-la.
   - `Trust Server Certificate=true` evita erro de certificado ao conectar; se tudo conectar sem ele, pode remover.
   - Troque `<SUA-SENHA>` pela senha do passo 2. Se a senha tiver caracteres como `;` ou `=`, troque por uma senha só com letras e números.
4. **Crie as tabelas:** no menu do Supabase abra o **SQL Editor > New query**. Abra, no GitHub, o arquivo `docs/banco/schema.sql` do repositório `viteme-api`, copie **todo** o conteúdo, cole no editor e clique em **Run**. Deve terminar sem erro. Confira em **Table Editor**: devem existir cerca de 14 tabelas (`usuario`, `evento`, `inscricao`…).

**Pronto quando:** as tabelas aparecem no Table Editor e você tem o texto de conexão anotado.

---

## Passo 2: assinatura do Azure

Você tem uma conta Microsoft, mas **sem assinatura**, e sem assinatura não dá para criar nada. Há dois caminhos; use o primeiro que servir.

**Caminho A: Azure for Students (melhor, se a faculdade for aceita)**
1. Acesse <https://azure.microsoft.com/free/students> e entre com o **e-mail da faculdade**.
2. Siga a verificação de estudante. Quando funciona, concede créditos sem pedir cartão.
3. Se a faculdade não for reconhecida, vá para o caminho B.

**Caminho B: conta gratuita do Azure**
1. Acesse <https://azure.microsoft.com/free> e clique em **Começar gratuitamente**.
2. Preencha os dados. Será pedido **telefone** (código por SMS) e **cartão de crédito** apenas para verificar a identidade. Em geral não há cobrança enquanto você não fizer *upgrade* para pagamento por uso: **não clique em "Upgrade"**.
3. A conta gratuita costuma incluir um crédito inicial por 30 dias e serviços "sempre gratuitos". O plano que vamos usar (App Service F1) é gratuito. Confira as condições atuais na página.

**Caminho C: você já tem uma assinatura de pagamento por uso (Pay-As-You-Go)**
Isso acontece, por exemplo, quando a conta gratuita foi atualizada ("Upgrade"). Dá para seguir normalmente: o plano que vamos usar, **App Service F1 (Gratuito)**, custa R$ 0 em qualquer tipo de assinatura. A diferença é que **o Azure passa a cobrar no cartão qualquer recurso pago**, e o orçamento só **avisa**, não bloqueia. Por isso, neste caminho, siga à risca estas regras:

1. **Só crie o que este roteiro manda**: um *Web App* no plano **Gratuito F1**. Nada de banco de dados do Azure, Application Insights, Front Door, Key Vault, máquinas virtuais etc. (O banco é o Supabase, o site é a Cloudflare.)
2. Na tela de revisão antes de criar, o **custo estimado deve ser R$ 0 (ou US$ 0)**. Se mostrar qualquer outro valor, **não crie**: volte e confira o plano.
3. Na aba **Monitoramento**, deixe **Application Insights = Não** (se aparecer ativado, desligue).
4. **Nunca clique em "Escalar" (*Scale up*) nem troque o plano** do App Service depois de criado.
5. Tudo dentro de **um único grupo de recursos** (`viteme-demo`), para poder apagar de uma vez.
6. **Crie o orçamento de alerta antes** de criar o app (veja abaixo) e confira o e-mail de alerta.
7. **Um dia depois de criar**, abra *Gerenciamento de Custos > Análise de custos* e confirme que o gasto está **zerado**. Repita depois da apresentação.
8. **Ao terminar, apague o grupo de recursos** (passo 9).
9. Se aparecer cobrança, **apague o grupo de recursos na hora** e depois investigue.

**Depois de criar (ou localizar) a assinatura:**
1. No portal (<https://portal.azure.com>), busque **Assinaturas** e confira que a sua aparece com estado **Ativa**.
2. **Crie um alerta de custo** (proteção contra cobrança acidental): busque **Cost Management > Orçamentos > Adicionar**, valor baixo (por exemplo, 10), com alertas por e-mail em 50%, 80% e 100%. Lembre que **o orçamento só avisa**; quem impede a cobrança é escolher o plano gratuito e apagar tudo no fim.

**Pronto quando:** existe uma assinatura ativa e o orçamento de alerta foi criado.

---

## Passo 3: criar a API no Azure (App Service)

1. No portal, clique em **Criar um recurso > Aplicativo Web** (*Web App*).
2. Aba **Básico**:

   | Campo | Valor |
   |---|---|
   | Assinatura | a que você criou |
   | Grupo de recursos | **Criar novo**: `viteme-demo` (tudo fica aqui, o que facilita apagar depois) |
   | Nome | por exemplo `viteme-api`. **Anote.** Com o "nome de host padrão exclusivo" ligado (padrão atual), o endereço fica `https://<nome>-<sufixo>.<região>.azurewebsites.net` |
   | Publicar | **Código** |
   | Pilha de runtime | **.NET 10 (LTS)** |
   | Sistema operacional | **Linux** |
   | Região | **West US 3** foi a que aceitou o plano gratuito na nossa assinatura (Brasil Sul pediu cota). Se o plano gratuito disser "sem cota", tente outra região. Crie o banco do Supabase numa região próxima à escolhida aqui |
   | Plano do Linux | **Criar novo** |
   | Plano de preços | **Gratuito F1** (procure em *Explorar planos de preço* > *Desenvolvimento/Teste*). O custo estimado deve ser **R$ 0** |

   Se o **.NET 10 não aparecer** na lista, avise a equipe técnica antes de seguir: será preciso publicar de outra forma.
   Antes de continuar, confira na aba **Monitoramento** que **Application Insights** está desativado.
3. Aba **Implantação**: pode deixar a implantação contínua desativada aqui; a ligação com o GitHub é feita no passo 4.
4. Clique em **Examinar + criar** e depois **Criar**. Aguarde terminar e clique em **Ir para o recurso**.
5. **Gere a chave secreta da API** (um texto aleatório longo). No Windows, abra o **PowerShell** e rode:

   ```powershell
   $b = New-Object byte[] 48; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); [Convert]::ToBase64String($b)
   ```

   (No Mac/Linux ou Git Bash: `openssl rand -base64 48`.) Copie o resultado e **anote como `Jwt__Chave`**. Não compartilhe e não coloque no GitHub.
6. **Configure as variáveis do app:** no menu do app, abra **Configurações > Variáveis de ambiente** (ou *Configuration*) e, na aba **Configurações do aplicativo**, adicione uma por uma:

   | Nome | Valor |
   |---|---|
   | `ASPNETCORE_ENVIRONMENT` | `Production` |
   | `ConnectionStrings__Default` | o texto de conexão do passo 1 |
   | `Jwt__Chave` | a chave do item 5 |
   | `Proxy__ConfiarEmCabecalhosEncaminhados` | `true` |
   | `Proxy__SaltosConfiaveis` | `2` (o site repassa os pedidos pela Cloudflare; assim o limite de tentativas de login vale por pessoa, e não para todos juntos) |
   | `Gateway__Stub__HabilitarSimulador` | `true` (**só na demonstração**: habilita os botões de pagamento simulado) |
   | `Cors__OrigemFrontend` | por enquanto `https://exemplo.pages.dev` (você troca no passo 6) |
   | `Certificados__UrlValidacao` | por enquanto `https://exemplo.pages.dev/certificados` (troca no passo 6) |
   | `Swagger__Habilitar` | `true` (opcional, para mostrar a documentação da API) |

   Clique em **Aplicar** e confirme o reinício do app.
7. Anote o **endereço da API** (na página *Visão geral*, campo *Domínio padrão*): `https://<nome>.azurewebsites.net`.

**Pronto quando:** o app existe, as variáveis estão salvas e você anotou o nome e o endereço.

---

## Passo 4: publicar a API (GitHub Actions)

A publicação é feita pelo **Centro de Implantação** (*Deployment Center*) do Azure, que liga o app ao GitHub com login sem senha (OIDC): não há perfil de publicação nem senha para copiar.

> **Situação atual (2026-10-25):** este passo **já foi feito**. O app `viteme-api` (grupo `viteme-demo`, plano F1, região **West US 3**) está ligado ao repositório `viteme-api`, e o workflow `.github/workflows/main_viteme-api.yml` foi ajustado para publicar **só depois que o CI passa** em um push na `main`, e apenas o projeto da API. Os itens abaixo servem para refazer a ligação do zero.

1. No portal, abra o app > **Implantação > Centro de Implantação**.
2. **Origem: GitHub**. Autorize, escolha a organização, o repositório `viteme-api` e a branch `main`.
3. Em **Tipo de autenticação**, escolha **Identidade atribuída pelo usuário** (OIDC). Salve. O Azure cria os segredos `AZUREAPPSERVICE_CLIENTID_…`, `…TENANTID_…` e `…SUBSCRIPTIONID_…` no repositório e grava um workflow `main_<nome-do-app>.yml` na `main`.
4. **Reaplique os ajustes do workflow** (o Azure grava um arquivo genérico, que publica a cada push sem esperar o CI). Os ajustes estão descritos em `docs/deploy.md` (seção 7) do `viteme-api`: manter os nomes dos segredos que o Azure criou e trocar o resto pelo modelo do repositório.
5. Para publicar à mão: **Actions > Publicar API no Azure (viteme-api) > Run workflow**.
6. **Teste a API:** abra no navegador `https://viteme-api-f5f3f2b8eacdbehp.westus3-01.azurewebsites.net/api/v1/saude`. Na **primeira vez demora** (o plano gratuito "acorda" o app) e deve responder `200`. Abra também `https://viteme-api-f5f3f2b8eacdbehp.westus3-01.azurewebsites.net/api/v1/eventos`: deve responder `{"itens":[],...}`.

   Se não responder: no portal do Azure, **Monitoramento > Fluxo de log** mostra o erro. **Sem as variáveis do passo 3.6 a API não inicia**: a publicação fica verde no GitHub, mas o endereço responde com erro. Os casos mais comuns estão na tabela de problemas no fim deste documento.

**Pronto quando:** `/api/v1/saude` e `/api/v1/eventos` respondem no endereço do Azure.

---

## Passo 5: site no Cloudflare Pages

1. Entre em <https://dash.cloudflare.com> e crie uma conta gratuita.
2. **Endereço da API:** é `https://viteme-api-f5f3f2b8eacdbehp.westus3-01.azurewebsites.net` (o Azure acrescenta um sufixo aleatório e a região ao nome do app; o endereço aparece no fim do log de publicação no GitHub e na *Visão geral* do app, campo *Domínio padrão*). Ele vai na variável `API_ORIGIN`, **no painel da Cloudflare** (item 4). O repositório não tem `wrangler.jsonc` de propósito: se tivesse, o painel deixaria as variáveis só para leitura.
3. Na Cloudflare: **Workers & Pages > Create > Pages > Connect to Git**. Autorize o GitHub e escolha o repositório `viteme-web`.
4. Configurações de build:

   | Campo | Valor |
   |---|---|
   | Production branch | `main` |
   | Framework preset | *None* (ou *Vite*) |
   | Build command | `npm run build` |
   | Build output directory | `dist` |
   | Variáveis de ambiente | `API_ORIGIN` = endereço da API do item 2 (tipo texto, **sem barra no final**); `VITE_SIMULADOR_PAGAMENTO` = `true` (**só para a demonstração**) e `NODE_VERSION` = `22` (o projeto precisa do Node 22; o arquivo `.nvmrc` do repositório também indica isso) |

   Se o projeto já existe, as variáveis ficam em **Settings > Variables and Secrets** (ambiente *Production*). Depois de salvar, **refaça o deploy** (*Deployments >* último deploy *> Retry deployment*): variável nova só vale em implantação nova.

5. **Save and Deploy**. Quando terminar, a Cloudflare mostra o endereço do site, algo como `https://viteme-web.pages.dev` (pode ter um sufixo se o nome já existir). **Anote.**

**Pronto quando:** o endereço do site abre a tela inicial "Descubra eventos". (Ainda não vai conseguir entrar nem carregar eventos: falta o passo 6.)

---

## Passo 6: ligar o site à API

A API só aceita pedidos de login/renovação vindos do endereço oficial do site, e o certificado precisa conhecer o endereço público.

1. Portal do Azure > seu app > **Configurações > Variáveis de ambiente** e altere:
   - `Cors__OrigemFrontend` = o endereço do site do passo 5, **igualzinho** ao que aparece no navegador, **sem barra no final** (`https://viteme-web.pages.dev`).
   - `Certificados__UrlValidacao` = `https://viteme-web.pages.dev/certificados`.
2. **Aplicar** e confirme o reinício. Em *Visão geral* clique em **Reiniciar**, se preferir garantir.

**Pronto quando:** as duas variáveis têm o endereço do site.

---

## Passo 7: testar

Abra o endereço do site (de preferência em uma **janela anônima**) e confira, nesta ordem:

- [ ] A tela inicial carrega e mostra "Ainda não há eventos publicados" (esperado: o banco está vazio).
- [ ] **Criar conta** funciona e você entra automaticamente (seu nome aparece no topo).
- [ ] **F5 (recarregar)** continua logado. *É o teste mais importante: prova que o cookie de sessão está funcionando.*
- [ ] Crie um evento em **Meus eventos > + Novo evento**, publique e veja no mural.
- [ ] Em outra janela anônima, crie outra conta e inscreva-se no evento.
- [ ] Sair e entrar de novo funciona.

Se algo falhar, veja a tabela de problemas abaixo.

---

## Passo 8: preparar a demonstração

1. Siga o [guia de uso](guia-de-uso.md). Preencha a tabela do início dele com o endereço do site e as contas.
2. **Crie as contas de demonstração** pelo próprio site: um **organizador** e um **participante** (guarde e-mail e senha).
3. **Dados de exemplo:** com a conta do organizador, crie 2 ou 3 eventos (um gratuito, um pago de R$ 25,00, um com o selo "Alterado", editando o local depois de publicar).
4. **Evento já encerrado, para mostrar o certificado.** O certificado só existe depois do fim do evento, então prepare um com antecedência:
   1. Com o organizador, crie um evento gratuito **com carga horária** (por exemplo 3) que comece **em cerca de 1 hora**, e publique.
   2. Com o participante, inscreva-se e anote o código de check-in (em *Minhas inscrições*).
   3. Com o organizador, faça o **check-in** com esse código (em *Gerenciar evento > Check-in*; funciona de 2 horas antes do início até o fim).
   4. No Supabase **SQL Editor**, rode (trocando o título pelo seu):

      ```sql
      update evento
         set inscricao_inicio = now() - interval '2 days',
             inscricao_fim    = now() - interval '6 hours',
             data_inicio      = now() - interval '5 hours',
             data_fim         = now() - interval '1 hour',
             status           = 'ENCERRADO'
       where titulo = 'TÍTULO DO EVENTO';
      ```
   5. Com o participante, abra **Minhas inscrições > Anteriores** e baixe o certificado. Guarde o código de validação impresso no PDF para mostrar a validação pública.
5. **Ensaie** o roteiro do guia de uso inteiro uma vez.
6. **No dia:** abra `https://viteme-api-f5f3f2b8eacdbehp.westus3-01.azurewebsites.net/api/v1/saude` uns 10 minutos antes, para a API acordar, e deixe a aba aberta.

---

## Passo 9: depois da apresentação

- **Azure:** apague o grupo de recursos `viteme-demo` (*Grupos de recursos > viteme-demo > Excluir*). Isso remove o app e o plano.
- **Cloudflare e Supabase:** podem ficar. O projeto gratuito do Supabase pode ser pausado após um período sem uso.
- Troque a chave `Jwt__Chave` se for reutilizar o ambiente, e **desligue** `Gateway__Stub__HabilitarSimulador`.

---

## Problemas comuns

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| `/api/v1/saude` demora ou dá erro logo depois de publicar | Plano gratuito acordando | Aguarde 1 a 2 minutos e tente de novo |
| O endereço da API mostra a **página padrão do Azure** ("Your web app is running and waiting for your content") e o *Fluxo de log* avisa *"found 2 '.runtimeconfig.json'"* | Sobras de uma publicação antiga na pasta do app (`Viteme.Tests.runtimeconfig.json`) | O workflow da `main` do `viteme-api` limpa a pasta e fixa `dotnet Viteme.Api.dll`: rode *Publicar API no Azure > Run workflow*. Na hora, dá para pôr `dotnet Viteme.Api.dll` em *Configurações > Configuração > Comando de inicialização* |
| API sobe e cai (erro 500.30, ou "Application Error") | Falta `Jwt__Chave` ou `ConnectionStrings__Default`, ou a chave tem menos de 32 caracteres | Confira as variáveis no passo 3.6 e o *Fluxo de log* |
| `/api/v1/eventos` dá erro de banco | Texto de conexão errado, senha errada ou tabelas não criadas | Confira o passo 1; teste a conexão; confirme o `schema.sql` |
| Erro de certificado ao conectar no banco | Falta `Trust Server Certificate=true` | Acrescente ao texto de conexão |
| O build do Pages falha com erro de versão do Node | Build usando um Node antigo | Defina `NODE_VERSION` = `22` nas variáveis de build e refaça o deploy |
| O site abre, mas mostra erro **502 "API indisponível"** | API dormindo ou `API_ORIGIN` errado no painel da Cloudflare | Abra o `/saude` da API; confira `API_ORIGIN` (sem barra final) e faça novo deploy |
| `/api/v1/saude` no site responde **500 `API_ORIGIN_AUSENTE`** | `API_ORIGIN` não definido no painel, ou definido sem refazer o deploy | Defina em *Settings > Variables and Secrets* (Production) e use *Retry deployment* |
| O painel diz que as variáveis são **gerenciadas pelo Wrangler** | Existe um `wrangler.jsonc` na branch publicada | Use a `main` atual (sem o arquivo) e refaça o deploy |
| Login funciona, mas **F5 desconecta** ou aparece "403 requisição não permitida" | `Cors__OrigemFrontend` diferente do endereço do site | Copie o endereço exato do navegador, sem barra final |
| O botão de simular pagamento não aparece | O site foi construído sem `VITE_SIMULADOR_PAGAMENTO=true` | Defina a variável de build na Cloudflare e faça novo deploy |
| Simular pagamento dá erro | `Gateway__Stub__HabilitarSimulador` não está `true` na API | Ajuste no Azure e reinicie |
| O "Run workflow" não aparece no GitHub | O arquivo do workflow não está na branch principal | Faça o merge na `main` |
| A publicação não roda depois de um push | O workflow só publica quando o **CI** termina com sucesso em um push na `main` | Veja o CI em *Actions*; corrija e envie de novo, ou use *Run workflow* |
| O workflow falha no login do Azure (`azure/login`) | Segredos `AZUREAPPSERVICE_…` apagados ou a ligação refeita com outros nomes | Refaça a ligação no Centro de Implantação (passo 4) e reaplique os ajustes do workflow |
| Tentativas de login dão "Muitas requisições" (429) para várias pessoas ao mesmo tempo | Falta `Proxy__SaltosConfiaveis=2`: a API enxerga todos com o IP da Cloudflare | Adicione a variável no Azure e reinicie |
| "Sem cota" ao criar o plano F1 | Região sem capacidade gratuita para a assinatura | Tente outra região |

## Para a equipe técnica

- O que cada variável faz: [hospedagem-cloudflare.md](hospedagem-cloudflare.md).
- Como o repasse `/api/*` funciona e seus limites: mesmo documento, seções "Como funciona" e "Limites e cuidados".
- Pendências ainda abertas depois do deploy: testar em Safari e Firefox, confirmar o cookie em produção (PW2), pagamento e SMS reais (fora do escopo, simulados).
