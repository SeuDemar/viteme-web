# Guia de uso do Viteme

O Viteme reúne em um só lugar a divulgação, a inscrição e o acompanhamento dos eventos da faculdade, com avisos de alteração e **sem taxa da plataforma**. Este guia explica como usar o sistema e traz um roteiro para a demonstração.

## Endereços e contas da demonstração

| Item | Valor |
|---|---|
| Endereço do sistema | _a preencher depois do deploy na Cloudflare_ (algo como `https://viteme-web.pages.dev`) |
| Documentação da API (Swagger) | _a preencher_ (`/swagger`, se habilitado) |
| Organizador de demonstração | _a preencher_ (e-mail e senha) |
| Participante de demonstração | _a preencher_ (e-mail e senha) |

Não há administrador no Viteme: o papel de cada pessoa é definido **por evento**. Quem cria um evento é o organizador dele; quem o organizador adiciona é colaborador; todas as outras pessoas logadas são participantes. A mesma conta pode ser organizadora de um evento e participante de outro.

> **Sobre a demonstração:** o pagamento e o envio de SMS são **simulados** (não há cobrança nem mensagem reais). Isso está previsto no projeto e deve ser dito na apresentação.

## O que cada pessoa pode fazer

| Quem | Pode |
|---|---|
| **Visitante** (sem login) | Ver o mural e os detalhes dos eventos, ver o histórico de alterações e validar certificados |
| **Participante** | Tudo do visitante, mais: inscrever-se, pagar, cancelar a própria inscrição, acompanhar eventos, receber notificações, denunciar eventos e baixar o próprio certificado |
| **Colaborador** de um evento | Ver os inscritos e fazer o check-in daquele evento |
| **Organizador** de um evento | Tudo do colaborador, mais: editar, publicar e cancelar o evento, gerenciar a programação e os colaboradores |

## Telas principais

| Menu | Para que serve |
|---|---|
| **Explorar eventos** | Mural com busca e filtros (Palestras, Workshops, Cursos, Feiras, Gratuitos). Eventos alterados nos últimos 3 dias têm o selo **Alterado** |
| **Minhas inscrições** | Suas inscrições (próximas e anteriores), o **código de check-in**, comprovante, pagamento pendente, cancelamento e certificado |
| **Meus eventos** | Eventos que você organiza ou em que colabora; botão **+ Novo evento** |
| **Notificações** | Avisos de inscrição, pagamento, alterações e lembretes. O número no menu mostra as não lidas |
| **Perfil** | Seus dados, verificação do telefone e avisos por SMS |

No celular, o menu fica no botão de três linhas e há uma barra de atalhos na parte de baixo da tela.

## Roteiro da demonstração

O roteiro segue o fluxo pedido na Entrega 3. Use **duas janelas** (ou uma janela anônima): uma como organizador e outra como participante.

### 1. Conta e acesso
1. Abra **Criar conta**, preencha nome, e-mail, senha (mínimo de 8 caracteres, com letra e número) e confirme. Telefone é opcional.
2. Você entra automaticamente. Recarregue a página (F5): a sessão continua.
3. **Sair** encerra a sessão. Tentar abrir uma tela de participante sem estar logado leva ao login e volta ao ponto de origem depois.

### 2. Organizador: criar e publicar um evento
1. Em **Meus eventos**, clique em **+ Novo evento**.
2. Preencha título, descrição, categoria, local, início e término, o período de inscrições (que termina até o início do evento), preço (use `0` para gratuito), capacidade e carga horária. **A carga horária é necessária para emitir certificado.**
3. **Salvar rascunho**. Em seguida, em **Programação**, adicione as atividades.
4. **Publicar evento**: ele passa a aparecer no mural.
5. Crie também um evento **pago** (por exemplo, R$ 25,00) para o roteiro de pagamento.

### 3. Participante: encontrar e se inscrever
1. No **mural**, use a busca e os filtros e abra um evento.
2. **Evento gratuito:** clique em **Inscrever-se gratuitamente**. A inscrição é confirmada na hora e aparece o **código de check-in** em *Minhas inscrições*.
3. **Evento pago:** clique em **Inscrever-se por R$ …**. A vaga fica reservada por **30 minutos**. Na tela de pagamento, o valor é exatamente o do evento (sem taxa da plataforma).
4. **Pagamento simulado:** com o modo demonstração ativo, aparecem os botões **Simular pagamento aprovado** e **Simular recusa**. Ao aprovar, a inscrição é confirmada e você volta para *Minhas inscrições*. Com recusa, é possível tentar de novo enquanto a reserva estiver válida.
5. Opcional: **Acompanhar evento** para receber avisos; **Denunciar este evento** (cada pessoa pode denunciar uma vez).

### 4. Organizador: alterar o evento
1. Em **Meus eventos > Editar**, mude o local ou a data de um evento já publicado.
2. O sistema exige o **motivo da alteração** (de 10 a 300 caracteres). Inscritos e interessados são avisados.
3. No mural o evento ganha o selo **Alterado**, e a página do evento mostra o que mudou e por quê. O participante vê a notificação no sino.

### 5. Check-in no dia do evento
1. O organizador (ou um colaborador) abre **Meus eventos > Gerenciar evento > Check-in**.
2. Digita o **código de 12 caracteres** que o participante mostra. O check-in vale **de 2 horas antes do início até o fim do evento** e não pode ser repetido.
3. A aba **Inscritos** mostra a presença confirmada. O telefone dos participantes nunca é exibido.

### 6. Certificado
1. Depois que o evento **termina**, quem teve a presença registrada vê o botão **Baixar certificado** em *Minhas inscrições > Anteriores*.
2. Qualquer pessoa pode validar o certificado em **/certificados**, digitando o código impresso no PDF, sem precisar de login.

> **Atenção para a apresentação:** o certificado só fica disponível depois do fim do evento. Para mostrá-lo em uma demonstração rápida, use um evento que já tenha terminado e em que o participante tenha feito check-in (peça à equipe técnica para preparar esse evento antes).

### 7. Avisos por SMS (opcional)
1. Em **Perfil**, informe o telefone e salve; clique em **Enviar código**.
2. Digite o código de 6 dígitos (vale por 10 minutos; novo envio só após 60 segundos).
3. Ative **Avisos por SMS**. Você pode desativar quando quiser. Trocar o telefone desfaz a verificação e o aceite.
4. Na demonstração o SMS é simulado: o código aparece apenas no registro da API, não chega ao celular.

## Dúvidas comuns

| Situação | O que significa |
|---|---|
| "Evento lotado" | Todas as vagas estão ocupadas ou reservadas por pagamentos pendentes |
| "Inscrições encerradas" | O prazo de inscrição do evento acabou |
| Não consigo me inscrever no meu próprio evento | Organizadores e colaboradores não se inscrevem no evento que gerenciam |
| Não consigo cancelar minha inscrição | O cancelamento só é possível até **24 horas antes** do início; se houve pagamento, o estorno é integral |
| "Conta bloqueada" | Houve 5 tentativas de login erradas; aguarde 15 minutos |
| O evento sumiu do mural | Ele foi cancelado, encerrado, ou ocultado após denúncias (com 5 denúncias de pessoas diferentes). Quem está inscrito ainda o vê |

## Para a equipe técnica

- Como subir a API, o banco e o frontend: [README](../README.md) e [validacao-api-real.md](validacao-api-real.md).
- O roteiro automatizado (`npm run e2e`) executa, contra a API real, os passos 1 a 7 acima (no passo 6 ele encerra o evento direto no banco).
- Como publicar: [hospedagem-cloudflare.md](hospedagem-cloudflare.md). Se a API estiver em hospedagem gratuita, abra `/api/v1/saude` alguns minutos antes para ela acordar.
- Pendências antes da demonstração: preencher os endereços e as contas da tabela do início, fazer o deploy e preparar os dados de exemplo e o evento já encerrado do passo 6.
