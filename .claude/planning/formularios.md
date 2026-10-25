# Formulários e validações

Fonte: PDF, Quadro 69. Os esquemas Zod ficam em `src/schemas/` e usam **os mesmos limites** dos validadores da API. A API sempre revalida; erros 400 (`errors` por campo) são mostrados nos campos correspondentes (CT61).

| Formulário | Campos | Validações no frontend |
|---|---|---|
| Cadastro (T04) | Nome, e-mail, senha, confirmação de senha, telefone (opcional) | Nome de 3 a 120 caracteres; e-mail válido; senha com 8 ou mais caracteres, letra e número; confirmação igual à senha; telefone com máscara e formato E.164 |
| Login (T03) | E-mail, senha | Obrigatórios; e-mail válido; botão desabilitado durante o envio |
| Evento (T10) | Título, descrição, categoria, local, imagem, datas e horários do evento e das inscrições, capacidade, preço, carga horária | Título de 5 a 150 caracteres; término após o início; inscrições terminando até o início; preço ≥ 0 com duas casas; capacidade e carga horária inteiras e positivas; aviso da taxa do gateway quando preço > 0 |
| Motivo da alteração (T10) | Motivo | Obrigatório, 10 a 300 caracteres; exibido só quando o evento está publicado e um campo relevante mudou |
| Atividade (T10) | Título, palestrante, local, início, fim | Título obrigatório; término após o início; horário dentro do período do evento |
| Colaborador (T11) | E-mail | E-mail válido |
| Check-in (T11) | Código | 12 caracteres alfanuméricos, convertidos para maiúsculas |
| Cancelamento do evento (T11) | Motivo | Obrigatório, 10 a 300 caracteres, com confirmação antes de enviar |
| Denúncia (T02) | Motivo, descrição | Motivo obrigatório (`EVENTO_FALSO`, `GOLPE`, `CONTEUDO_IMPROPRIO`, `SPAM`, `OUTRO`); descrição obrigatória se o motivo for "Outro"; até 500 caracteres |
| Verificação de telefone (T08) | Código | 6 dígitos numéricos; botão de reenvio liberado após 60 s, com contador |
| Perfil (T08) | Nome, telefone | Mesmas regras do cadastro |

## Convenções
- Mensagens em português, junto ao campo, com `aria-describedby`/`aria-live`.
- Campos de data: o usuário digita no fuso local; enviar em **ISO 8601 UTC**.
- Preço: aceitar vírgula e converter; enviar número com duas casas.
- Telefone: máscara na tela, E.164 no envio.
- A descrição do evento é **texto puro** (sem HTML); exibir sem `dangerouslySetInnerHTML`.
- Formulário de evento publicado: enviar `If-Match` com a versão (ETag) obtida na leitura; em 412 `VERSAO_DESATUALIZADA` oferecer recarregar sem perder o texto digitado.
- Conferir os limites exatos (tamanhos, categorias, formato da imagem) nos DTOs e no Swagger da API antes de fechar cada esquema (PW3).
