# Telas (T01–T12)

Fonte: PDF, Quadro 68 e Figura 4, e o protótipo do Figma ("Viteme — Protótipo Acadêmico, Desktop e Mobile"), recebido como capturas de tela. A coluna **Figma** diz de que frame a tela veio e o que foi acrescentado além dele. Todas as telas funcionam em **desktop e mobile**.

Estados obrigatórios em toda tela com consulta: carregando, vazio, erro com "Tentar novamente".

## Resumo

Todas as telas abaixo estão **implementadas**. As divergências entre o Figma e a API estão em [pendencias.md](pendencias.md) (PW1, PW11, PW12).

| Cód. | Tela | Rota | Acesso | Endpoints | Figma |
|---|---|---|---|---|---|
| T01 | Mural de eventos | `/` | Público | E10 | Frame "Descubra eventos" (desktop e mobile). Acrescentado: filtros Cursos, Feiras e Gratuitos, selo Lotado, vagas, imagem, "Carregar mais", estados |
| T02 | Detalhe do evento | `/eventos/:id` | Público | E11, E17, E24, E32, E33, E37 | Frame "Detalhes do evento" (desktop e mobile). Acrescentado: alterações recentes, organização, denúncia, "Deixar de acompanhar", estados por papel |
| T03 | Login | `/entrar` | Público | E02 | Frame "Entrar na sua conta" (desktop e mobile) |
| T04 | Cadastro | `/cadastro` | Público | E01 | Frame "Criar uma conta" (desktop e mobile) |
| T05 | Minhas inscrições | `/minhas-inscricoes` | Autenticado | E25, E26, E29, E38 | Frame "Minhas inscrições" (desktop e mobile). Acrescentado: cancelar, certificado, comprovante em janela |
| T06 | Pagamento | `/inscricoes/:id/pagamento` | Autenticado | E29, E30 | Frame "Pagamento" (desktop e mobile). Acrescentado: polling de 5 s, prazo da reserva, modo demonstração |
| T07 | Notificações | `/notificacoes` | Autenticado | E34, E35, E36 | Frame "Notificações" (desktop e mobile). Acrescentado: filtro Não lidas, destaque das novas, data |
| T08 | Perfil e SMS | `/perfil` | Autenticado | E05–E09, E40 | Frame "Meu perfil" (desktop e mobile). Acrescentado: verificação do telefone com código e contador de 60 s; seção "Dados de organizador" (CNPJ, D-W22) |
| T09 | Meus eventos | `/meus-eventos` | Autenticado | E16 | Frame "Meus eventos" (desktop e mobile). Acrescentado: filtro por papel, links Editar e Ver página pública |
| T10 | Criar/editar evento | `/meus-eventos/novo`, `/meus-eventos/:id/editar` | Organizador | E12, E13, E14, E18–E20 | Frame "Criar evento" (desktop; sem mobile no Figma). Acrescentado: término, janela de inscrições, carga horária, imagem, programação, motivo da alteração |
| T11 | Gestão do evento | `/meus-eventos/:id` | Org./colab. | E15, E17, E21–E23, E27, E28 | Frame "Gestão do evento" (desktop; sem mobile no Figma). Acrescentado: abas Alterações e Colaboradores completas, busca e paginação, cancelamento |
| T12 | Validar certificado | `/certificados/:codigo` | Público | E39 | Frame "Validar certificado" (desktop; sem mobile no Figma) |

## Detalhes

### T01 — Mural de eventos
- Cards (`EventoCard`) com busca e filtros (conferir parâmetros aceitos por E10: busca, categoria, período, preço, paginação).
- Selo **"Alterado"** para eventos alterados nas últimas 72 h (CT62).
- Eventos de rascunho/ocultos nunca aparecem (a API já filtra).
- Paginação (`{ itens, pagina, tamanhoPagina, total }`).

### T02 — Detalhe do evento
- Informações, programação (atividades), vagas restantes, preço, histórico de alterações (E17) com a mais recente em destaque.
- Botões conforme o usuário:
  - **Inscrever-se** (E24): visitante vai a T03 e volta; organizador/colaborador do evento vê indisponível (`PAPEL_NAO_PERMITE_INSCRICAO`); inscrito vê "Você já está inscrito"; evento lotado/encerrado mostra o motivo.
  - **Acompanhar / Deixar de acompanhar** (E32/E33), idempotentes.
  - **Denunciar** (E37): modal com motivo e descrição.
- Evento OCULTO: inscrito vê normalmente; os demais recebem 404 → mostrar "Evento indisponível" (CT55).
- Evento pago: informar "Sem taxa da plataforma" (RN12).

### T03 — Login
- E-mail e senha; botão desabilitado durante o envio. Erros: 401 `CREDENCIAIS_INVALIDAS` (mensagem genérica), 423 `CONTA_BLOQUEADA` (avisar tempo), 429.
- Após sucesso, volta à página de origem (`state.from`) ou `/`.
- Link para T04.

### T04 — Cadastro
- Nome, e-mail, senha, confirmação, telefone (opcional, máscara E.164). Erros: 409 `EMAIL_JA_CADASTRADO`, 400 por campo.
- Após cadastro, login automático ou redirecionamento a T03 (definir com o Figma).

### T05 — Minhas inscrições
- Abas **Próximas / Passadas** (`situacao=proximas|passadas|todas`).
- Por inscrição: status, **código de check-in** (12 caracteres), prazo da reserva (`reservadaAte`) quando pendente, botões Cancelar (E26, com confirmação), Pagar/Retomar (E29) e **Certificado** (E38, quando `certificadoDisponivel`; baixa o PDF).
- Cancelamento: tratar `PRAZO_CANCELAMENTO_ENCERRADO` (até 24 h antes) e mostrar se houve `estornoSolicitado`.

### T06 — Pagamento
- Resumo (valor exato do evento, sem taxa da plataforma; prazo da reserva) e redirecionamento ao gateway (`urlPagamento`).
- Ao voltar, consulta E30 a cada **5 s por até 2 min**; se ainda pendente, avisa que a confirmação pode demorar e que aparecerá em T05. Aprovado → T05. Recusado → permite tentar de novo (E29).
- Reserva expirada (`RESERVA_EXPIRADA`) → orientar a se inscrever de novo.

### T07 — Notificações
- Lista paginada (E34), filtro lidas/não lidas, marcar uma (E35) e todas (E36). Notificação de alteração leva ao evento (T02).
- O **sino** do cabeçalho mostra `naoLidas`, consultando E34 (`lidas=false`) a cada 60 s e ao voltar o foco para a aba.

### T08 — Perfil e SMS
- Dados pessoais (E05/E06: nome e telefone).
- Verificação de telefone: pedir código (E07), digitar 6 dígitos (E08), **reenvio liberado após 60 s com contador**; erros `CODIGO_EXPIRADO`, `TENTATIVAS_EXCEDIDAS`, `AGUARDE_NOVO_CODIGO`.
- Aceite de SMS (E09): só habilita com telefone verificado; pode revogar a qualquer momento. Trocar o telefone desfaz verificação e aceite (avisar antes).
- Dados de organizador (E40, RN24): CNPJ com máscara (aceita o formato alfanumérico), verificado na Receita pela API; mostra razão social e data da verificação; "Trocar CNPJ". Erros `CNPJ_JA_CADASTRADO`, `CNPJ_NAO_ENCONTRADO`, `CNPJ_INATIVO`, `CONSULTA_CNPJ_INDISPONIVEL` com o texto da API.

### T09 — Meus eventos
- Eventos que organiza ou colabora (E16), com status (rascunho, publicado, oculto, cancelado, encerrado) e o papel do usuário. Botão "Novo evento".

### T10 — Criar/editar evento
- Formulário do evento e da programação (atividades: E18–E20). Salvar como rascunho (E12), editar (E13, com `If-Match`), publicar (E14).
- Campo **motivo da alteração** só quando o evento está publicado e um campo relevante muda (título, data, horário, local, programação).
- Aviso da taxa do gateway quando o preço > 0. Preço bloqueado com inscrição paga/pendente (`PRECO_BLOQUEADO`); capacidade não pode ficar abaixo das vagas ocupadas.
- Tratar 412 `VERSAO_DESATUALIZADA` (oferecer recarregar).

### T11 — Gestão do evento
- Abas: **Inscritos** (E27: busca, filtro de status, paginação; sem telefone), **Check-in** (E28: código de 12 caracteres em maiúsculas), **Colaboradores** (E21–E23; só organizador altera), **Alterações** (E17) e **Cancelamento** (E15: motivo 10–300 caracteres + confirmação; só organizador).
- Colaborador vê Inscritos e Check-in; abas de organizador ficam ocultas.

### T12 — Validar certificado
- Aberta pelo link/QR do certificado, sem login. Mostra participante, evento, data, carga horária e emissão (E39) ou "Certificado não encontrado" (404). Tratar 429.

## Navegação (Figura 4 do PDF)

Cabeçalho fixo dá acesso a T01, T05, T07, T08 e T09. Telas de **participante** (T05–T08) e de **organizador** (T09–T11) exigem login. Visitante que tenta ação autenticada vai a T03 e volta ao ponto de origem. Sair (E04) no cabeçalho. T02 → T03 → T02; T02 → T06 (evento pago) ou T05 (gratuito); T04 ↔ T03; T09 → T11/T10; T10 → T11 ao salvar; T05 → T12 pelo link do certificado.
