# Fluxos principais

Fonte: PDF, seção 5.4. Os fluxos 1–3 compõem o **fluxo mínimo da demonstração**: cadastro → login → mural → inscrição (gratuita e paga) → minhas inscrições → criar/publicar evento → check-in → certificado.

## 1. Inscrição em evento gratuito
1. T01 Mural → abre o evento (T02).
2. "Inscrever-se"; sem login, passa por T03 e volta.
3. E24 retorna `CONFIRMADA`.
4. Confirmação com o **código de check-in** e vai a T05.

## 2. Inscrição em evento pago
1. T02 → "Inscrever-se"; E24 retorna `PENDENTE_PAGAMENTO` com `pagamento.urlPagamento` e `reservadaAte` (30 min).
2. T06 mostra valor e prazo e redireciona ao gateway.
3. Gateway devolve o usuário a T06 (URL de retorno com o id da inscrição); T06 consulta E30 a cada 5 s por até 2 min.
4. Aprovado → T05 com inscrição confirmada. Recusado → tentar de novo (E29). Ainda pendente após 2 min → mensagem "pode levar alguns minutos; aparecerá em Minhas inscrições".
5. Falhas: `GATEWAY_INDISPONIVEL` (502) → inscrição expirada, orientar a tentar de novo; `RESERVA_EXPIRADA` → nova inscrição.

> Na demonstração o gateway é stub: ver PW5 para como simular a aprovação.

## 3. Criação e publicação de evento
1. T09 → "Novo evento" → T10.
2. Salva como rascunho (E12) e adiciona programação (E18).
3. "Publicar" (E14); o evento passa a aparecer no mural. Erros: `DADOS_INCOMPLETOS`, `DATA_INICIO_PASSADA`.

## 4. Alteração de evento publicado
1. T10: organizador muda data, local ou programação.
2. O formulário exige o **motivo** (10–300 caracteres).
3. E13 registra a alteração e notifica inscritos e interessados (site e, para quem aceitou, SMS).
4. No mural o evento ganha o selo "Alterado" (72 h); em T02 a alteração aparece em destaque.

## 5. Check-in e certificado
1. No dia, o colaborador abre T11 → aba Check-in e digita o código do participante (E28). Janela: 2 h antes do início até o fim do evento.
2. Depois do encerramento, o participante baixa o certificado em T05 (E38).
3. Qualquer pessoa valida em T12 (E39).

## 6. Ativação do SMS
1. T08: informa o telefone e pede o código (E07).
2. Digita o código recebido (E08).
3. Ativa "Receber avisos por SMS" (E09).

## 7. Fluxos de apoio
- **Cancelar inscrição** (T05, E26): confirmação → resposta mostra se o estorno foi solicitado.
- **Denunciar evento** (T02, E37): modal; tratar `DENUNCIA_EXISTENTE` e `NAO_PODE_DENUNCIAR_PROPRIO_EVENTO`.
- **Cancelar evento** (T11, E15): motivo + confirmação; todas as inscrições são canceladas e há estornos.
- **Evento oculto por denúncias** (RN19): organizador é avisado (notificação), pode editar e republicar **uma vez**.
- **Sessão expirada**: ver [autenticacao.md](autenticacao.md).
