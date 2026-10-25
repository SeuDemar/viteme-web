# Pendências do frontend

| Cód. | Pendência | Responsável | Quando | Situação |
|---|---|---|---|---|
| PW1 | **Conferir telas, fluxos e responsividade com o protótipo do Figma.** O arquivo não foi acessível pela sessão de planejamento (sem conector e sem acesso à rede). Enviar os frames (PNG/PDF) ou liberar o acesso; depois preencher a coluna "Figma" de [telas.md](telas.md) e ajustar o que divergir do PDF | Equipe | Antes da W0 | Aberta |
| PW2 | **Mudança na API para D-W03/D-W04.** Feita no `viteme-api` (D47, commit `d298f4a`): cookie `SameSite=None; Secure`, `X-Requested-With: viteme-web` obrigatório em E03/E04, `Origin` conferido contra `Cors__OrigemFrontend`, 403 `REQUISICAO_NAO_PERMITIDA`, CORS libera o cabeçalho. **Falta** validar no navegador, na hospedagem real, o comportamento com bloqueio de cookies entre sites (Safari, Firefox estrito, Chrome); se falhar, hospedar sob o mesmo domínio registrável | Dev | Teste na W6 | Feita na API; validar na hospedagem |
| PW3 | Conferir no Swagger/DTOs da API os limites exatos dos campos (tamanhos, categorias, formato de imagem, parâmetros de filtro de E10) e alinhar os esquemas Zod | Dev | W0–W2 | Aberta |
| PW4 | Escolher hospedagem do frontend e URL pública da API para a demonstração (HTTPS) | Equipe | Antes da W6 | Aberta |
| PW5 | Definir como a banca simula o pagamento com o gateway stub (o backend tem um simulador de pagamento para demonstração; decidir se ganha botão em T06 apenas em ambiente de demonstração ou segue por endpoint/Swagger) | Equipe | Antes da W3 | Aberta |
| PW6 | Escolher a biblioteca de UI e o sistema de design (tokens) a partir do Figma | Equipe | W0 | Aberta |
| PW7 | Decidir o formato de entrega da imagem do evento (URL ou upload) conforme E12 | Dev | Antes da W5 | Aberta |
| PW8 | Definir se o cadastro faz login automático ou volta a T03 | Equipe | W1 | Aberta |
| PW10 | Várias abas abertas: reutilizar um refresh token já revogado revoga **todas** as sessões (P40 da API). Renovar em uma aba só e compartilhar o resultado (Web Locks API ou `BroadcastChannel`), além do single-flight dentro da aba | Dev | W1 | Aberta |
| PW9 | Informar `papel` do usuário no evento em E11/E16 se a API ainda não devolver; senão o frontend deduz por E16 e pelos 403/404 | Dev (API) | W5 | Aberta |
