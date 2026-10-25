# Pendências do frontend

| Cód. | Pendência | Responsável | Quando | Situação |
|---|---|---|---|---|
| PW1 | **Figma conferido** a partir das capturas (desktop e mobile). Falta o acesso ao arquivo original: o Figma não abre pela sessão de desenvolvimento (sem conector). Faltam os frames **mobile** de T10, T11 e T12 e os estados vazios, de erro e de carregamento (foram desenhados seguindo o padrão) | Equipe | W6 | Parcial |
| PW2 | **Mudança na API para D-W03/D-W04.** Feita no `viteme-api` (D47, commit `d298f4a`): cookie `SameSite=None; Secure`, `X-Requested-With: viteme-web` obrigatório em E03/E04, `Origin` conferido contra `Cors__OrigemFrontend`, 403 `REQUISICAO_NAO_PERMITIDA`, CORS libera o cabeçalho. **Falta** validar no navegador, na hospedagem real, o comportamento com bloqueio de cookies entre sites (Safari, Firefox estrito, Chrome); se falhar, hospedar sob o mesmo domínio registrável | Dev | Teste na W6 | Feita na API; validar na hospedagem |
| PW3 | Conferir no Swagger/DTOs da API os limites exatos dos campos (tamanhos, categorias, formato de imagem, parâmetros de filtro de E10) e alinhar os esquemas Zod | Dev | W0–W2 | Aberta |
| PW4 | Escolher hospedagem do frontend e URL pública da API para a demonstração (HTTPS) | Equipe | Antes da W6 | Aberta |
| PW5 | Pagamento na demonstração: com `VITE_SIMULADOR_PAGAMENTO=true` a tela de pagamento mostra os botões "Simular pagamento aprovado/recusa" (usam `POST /simulador/pagamentos/{idTransacao}/{resultado}`, que a API só habilita com `Gateway__Stub__HabilitarSimulador=true`). Decidir se a banca usa esse modo | Equipe | Antes da demonstração | Implementado |
| PW6 | ~~Biblioteca de UI~~: CSS próprio com os tokens do Figma (D-W12) | Equipe | — | Resolvida |
| PW7 | Decidir o formato de entrega da imagem do evento (URL ou upload) conforme E12 | Dev | Antes da W5 | Aberta |
| PW8 | ~~Login automático após o cadastro~~: sim (D-W13) | Equipe | — | Resolvida |
| PW10 | Várias abas: a renovação usa Web Locks (`navigator.locks`) para serializar entre abas, além do single-flight dentro da aba. Validar com duas abas abertas na hospedagem | Dev | W6 | Implementado; validar |
| PW9 | Informar `papel` do usuário no evento em E11/E16 se a API ainda não devolver; senão o frontend deduz por E16 e pelos 403/404 | Dev (API) | W5 | Aberta |
| PW11 | **Lacunas do contrato da API frente ao Figma**: (a) E10 não informa se as inscrições estão abertas, então o card mostra "Inscrições abertas" para todo evento não lotado; sugerir `inscricoesAbertas` em E10; (b) E16 não devolve o número de inscritos (o Figma mostra "96 inscritos" em Meus eventos); a tela de gestão calcula `capacidade − vagasRestantes` quando há capacidade; (c) não há lista oficial de categorias (D-W15) | Dev (API) | W6 | Aberta |
| PW12 | Estados não desenhados no Figma e que foram criados seguindo o padrão: carregando, vazio, erro com "Tentar novamente", Lotado, cancelada/expirada, modais (comprovante, denúncia, cancelamento), verificação do telefone, programação em T10 e abas Alterações/Colaboradores em T11. Conferir com a equipe | Equipe | W6 | Aberta |
| PW13 | O Figma não tem tela de **"Acesso negado"** nem de **evento indisponível**; usamos mensagens simples com link de volta | Equipe | W6 | Aberta |
