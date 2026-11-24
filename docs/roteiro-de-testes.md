# Roteiro de testes: pedidos da equipe (novembro de 2026)

Roteiro para conferir, no site publicado, tudo o que entrou com os pedidos de 27/10 e 03/11. Cada item diz **o que fazer** e **o que deve acontecer**. Marque `[x]` no que passar e anote o que falhar (tela, passo e mensagem).

Os testes automáticos já cobrem estes fluxos (81 testes no frontend, 323 na API e o roteiro ponta a ponta com 42 passos). Este roteiro serve para conferir no ambiente real, com celular de verdade, que é o que os testes automáticos não alcançam.

## Antes de começar

- [ ] A API e o site foram publicados com esta versão. **Não há migration nova** desta vez; a do CNPJ (`CnpjUsuario`) já foi aplicada.
- [ ] Você tem duas contas:
  - **Organizador**: com um **CNPJ real e ativo** (do centro acadêmico, da atlética ou um MEI).
  - **Participante**: sem CNPJ.
- [ ] Você tem um **computador** e um **celular**. Para o QR code, um aparelho mostra o código e o outro lê com a câmera.
- [ ] Use o endereço com **https** (<https://viteme-web.pages.dev>). A câmera não funciona sem https.
- [ ] Depois de publicar, recarregue com **Ctrl+Shift+R** para não ver a versão antiga em cache.

---

## 1. Cabeçalho (menu do topo)

| # | Faça | Deve acontecer | OK |
|---|---|---|---|
| 1.1 | Entre com qualquer conta no computador | O menu do topo é uma **barra com cantos arredondados**. Tem só "Explorar eventos", "Minhas inscrições" e "Meus eventos" em texto | [ ] |
| 1.2 | Olhe à direita da barra | Um **sino** e um **círculo com suas iniciais**. Com notificações não lidas, o sino mostra um número | [ ] |
| 1.3 | Clique no sino | Abre a página de Notificações | [ ] |
| 1.4 | Clique nas iniciais | Abre um menu com seu nome, e-mail, **Meu perfil** e **Sair** | [ ] |
| 1.5 | Com o menu aberto, aperte **Esc** ou clique fora dele | O menu fecha | [ ] |
| 1.6 | Clique em **Meu perfil** | Vai para o Perfil | [ ] |
| 1.7 | No celular, abra o site | O topo mostra o logo, o **sino** e o botão **☰**. Embaixo aparece a barra com Início, Inscrições, Eventos e Perfil | [ ] |
| 1.8 | No celular, toque em **☰** | Abre o menu com os links, Notificações, Perfil, seu nome e **Sair** | [ ] |

## 2. Página inicial (mural)

| # | Faça | Deve acontecer | OK |
|---|---|---|---|
| 2.1 | Abra a página inicial no computador | Eventos em **cards lado a lado** (grade). Cada card tem um bloco com o dia e o mês, a categoria, o horário, o local com ícone, o preço e a situação das inscrições | [ ] |
| 2.2 | Altere o local de um evento publicado (com motivo) e volte ao mural | O card **não** mostra mais o selo "Alterado" | [ ] |
| 2.3 | Abra esse evento | Aparece o quadro **"Este evento foi alterado"** com o motivo | [ ] |
| 2.4 | Digite algo na busca | A lupa aparece dentro do campo e a lista filtra | [ ] |
| 2.5 | Abra no celular | Um card por linha, sem rolagem para os lados | [ ] |

## 3. Página do evento

| # | Faça | Deve acontecer | OK |
|---|---|---|---|
| 3.1 | Abra um evento com várias atividades na programação | A **Programação** aparece como **linha do tempo**: bolinhas ligadas por uma linha, com início e fim de cada atividade, em ordem de horário | [ ] |
| 3.2 | Olhe os botões | Os botões principais têm ícone: inscrever-se (✓), acompanhar (estrela), ver inscrição (QR), gerenciar (pessoas), denunciar (bandeira). Os ícones não aparecem em todo lugar | [ ] |

## 4. Avisos rápidos (toasts)

Cada ação abaixo deve mostrar um **aviso no canto inferior direito** (no celular, acima da barra de baixo). Ele some sozinho em uns 5 segundos, fica parado enquanto o mouse está em cima e tem um **×** para fechar.

| # | Faça | Aviso esperado | OK |
|---|---|---|---|
| 4.1 | Perfil > mude o nome > **Salvar perfil** | "Perfil atualizado." | [ ] |
| 4.2 | Ative ou desative os avisos por SMS (com telefone verificado) | "Avisos por SMS ativados." / "desativados." | [ ] |
| 4.3 | Página do evento > **Acompanhar evento** | "Pronto! Você vai receber os avisos deste evento." | [ ] |
| 4.4 | Organizador: crie um rascunho | "Rascunho criado. Agora monte a programação…" | [ ] |
| 4.5 | Salve o rascunho de novo | "Rascunho salvo." | [ ] |
| 4.6 | **Publicar evento** | "Evento publicado! Ele já aparece no mural." | [ ] |
| 4.7 | Gestão > Colaboradores > adicione e depois remova alguém | "… agora colabora com o evento." / "… não colabora mais com o evento." | [ ] |
| 4.8 | Participante: cancele uma inscrição | "Inscrição cancelada." (ou "…estorno do pagamento foi solicitado.") | [ ] |
| 4.9 | Clique no **×** de um aviso | O aviso fecha na hora | [ ] |

Erros de formulário continuam aparecendo **no campo** com problema, não em aviso.

## 5. CNPJ do organizador (do PR anterior, ainda sem teste real)

| # | Faça | Deve acontecer | OK |
|---|---|---|---|
| 5.1 | Com a conta **sem CNPJ**: Meus eventos > **Novo evento** | Aparece "Cadastre um CNPJ para criar eventos" e o link para o Perfil, sem o formulário | [ ] |
| 5.2 | Perfil > Dados de organizador > digite um **CNPJ real e ativo** > **Verificar CNPJ** | Aviso "CNPJ verificado…", com a **razão social** e o selo "CNPJ verificado". **Este é o teste da consulta real à Receita (BrasilAPI)** | [ ] |
| 5.3 | Digite um CNPJ com o último dígito errado | "Informe um CNPJ válido." no campo, sem consultar a Receita | [ ] |
| 5.4 | Use o mesmo CNPJ em outra conta | "Este CNPJ já está vinculado a outra conta." | [ ] |

Se o 5.2 der **"Consulta de CNPJ indisponível"**, o servidor (Azure) não está conseguindo acessar a BrasilAPI: anote e avise.

## 6. Data de início no futuro

| # | Faça | Deve acontecer | OK |
|---|---|---|---|
| 6.1 | Novo evento com o início **ontem** > **Salvar rascunho** | Erro no campo início: "A data e a hora de início precisam ser posteriores ao momento atual." Nada é salvo | [ ] |
| 6.2 | Início **hoje, uma hora atrás** | O mesmo erro: a hora também conta | [ ] |
| 6.3 | Início **amanhã** | Salva normalmente | [ ] |
| 6.4 | Edite esse rascunho e mude o início para **ontem** | Mesmo erro, não salva | [ ] |
| 6.5 | Em um evento **já em andamento**, mude só a descrição e salve | Salva normalmente: sem mexer na data, não há bloqueio | [ ] |
| 6.6 | Abra o seletor de data do campo início | Os dias passados aparecem desabilitados (Chrome e Edge) | [ ] |

## 7. Aluno inscrito também pode ser colaborador

| # | Faça | Deve acontecer | OK |
|---|---|---|---|
| 7.1 | Participante: inscreva-se em um evento | Inscrição confirmada | [ ] |
| 7.2 | Organizador: Gestão > Colaboradores > adicione o e-mail desse participante | Aceita, com o aviso "… agora colabora com o evento." **Antes isso dava erro** | [ ] |
| 7.3 | Participante: abra a página do evento | Aparece "Você colabora com este evento", o botão **Gerenciar evento** e também "Você está inscrito neste evento" | [ ] |
| 7.4 | Participante: Gerenciar evento > aba Check-in | Consegue fazer check-in de outras pessoas | [ ] |
| 7.5 | Adicione como colaborador alguém **não inscrito** e abra o evento com essa conta | Vê "Gerenciar evento" **e** o botão de se inscrever | [ ] |
| 7.6 | Organizador: abra o próprio evento | **Não** vê o botão de se inscrever | [ ] |

## 8. Check-in por QR code

Para o check-in funcionar, o evento precisa **começar em até 2 horas**. Crie um evento gratuito começando daqui a 1 hora e inscreva o participante nele.

| # | Faça | Deve acontecer | OK |
|---|---|---|---|
| 8.1 | **Celular do participante**: Minhas inscrições > **Mostrar QR code** | Abre o comprovante com um **QR code** grande e o código de 12 caracteres embaixo | [ ] |
| 8.2 | **Outro aparelho, como organizador**: Meus eventos > Gerenciar > aba **Check-in** > **Ler QR code** | O navegador pede permissão da câmera. Depois aparece a imagem da câmera com uma moldura no centro | [ ] |
| 8.3 | Aponte para o QR do participante | Em 1 ou 2 segundos aparece, em verde, "**Presença de [nome] confirmada às …**" | [ ] |
| 8.4 | Continue apontando para o mesmo QR | Não registra de novo (sem erro repetido) | [ ] |
| 8.5 | Feche e abra a câmera, e leia o mesmo QR | "O check-in deste código já foi realizado." | [ ] |
| 8.6 | Aponte para um QR qualquer, por exemplo o de um site | "Este QR code não é um código de check-in do Viteme." | [ ] |
| 8.7 | Leia o QR de uma inscrição de **outro evento** | "Nenhuma inscrição com este código neste evento." | [ ] |
| 8.8 | Clique em **Fechar câmera** | A imagem some e a luz da câmera do aparelho apaga | [ ] |
| 8.9 | Negue a permissão da câmera (ou teste num aparelho sem câmera) | Mensagem explicando, e o campo para **digitar o código** continua funcionando | [ ] |
| 8.10 | Abra a aba **Inscritos** | O participante aparece como **Presente** com o horário | [ ] |

Repita o 8.2 e o 8.3 em **dois tipos de celular**, porque eles leem o QR de jeitos diferentes:
- [ ] **Android com Chrome**: usa o leitor nativo do navegador.
- [ ] **iPhone com Safari**: usa a leitura pela biblioteca do site.

## 9. Conferência geral rápida (nada pode ter quebrado)

| # | Faça | Deve acontecer | OK |
|---|---|---|---|
| 9.1 | Cadastro, login, F5 logado e sair pelo menu do avatar | Tudo funciona; depois de sair, o F5 continua deslogado | [ ] |
| 9.2 | Inscrição em evento pago e pagamento simulado (se o simulador estiver ligado) | Volta a Minhas inscrições com "Pagamento aprovado!" | [ ] |
| 9.3 | Certificado de um evento encerrado com check-in | Baixa o PDF; a validação pública funciona | [ ] |
| 9.4 | Navegue pelas telas no celular | Nada fica cortado e não há rolagem para os lados | [ ] |

---

## Se algo falhar

Anote o **número do item**, o **aparelho e o navegador**, o **que apareceu na tela** (de preferência uma captura) e o **horário**. Com isso dá para achar o erro no log da API.
