# Pendências do frontend

| Cód. | Pendência | Responsável | Quando | Situação |
|---|---|---|---|---|
| PW1 | **Conferir telas, fluxos e responsividade com o protótipo do Figma.** O arquivo não foi acessível pela sessão de planejamento (sem conector e sem acesso à rede). Enviar os frames (PNG/PDF) ou liberar o acesso; depois preencher a coluna "Figma" de [telas.md](telas.md) e ajustar o que divergir do PDF | Equipe | Antes da W0 | Aberta |
| PW2 | **Mudança na API para D-W03/D-W04:** cookie de refresh com `SameSite=None; Secure`, `Path=/api/v1/auth`, exigir `X-Requested-With` em E03/E04, conferir `Origin`, atualizar testes, `docs/deploy.md`, `seguranca.md` e as pendências P8/P11 do backend. Verificar o comportamento em navegadores com bloqueio de cookies entre sites | Dev (API) | Antes da W1 fora do localhost | Aberta |
| PW3 | Conferir no Swagger/DTOs da API os limites exatos dos campos (tamanhos, categorias, formato de imagem, parâmetros de filtro de E10) e alinhar os esquemas Zod | Dev | W0–W2 | Aberta |
| PW4 | Escolher hospedagem do frontend e URL pública da API para a demonstração (HTTPS) | Equipe | Antes da W6 | Aberta |
| PW5 | Definir como a banca simula o pagamento com o gateway stub (o backend tem um simulador de pagamento para demonstração; decidir se ganha botão em T06 apenas em ambiente de demonstração ou segue por endpoint/Swagger) | Equipe | Antes da W3 | Aberta |
| PW6 | Escolher a biblioteca de UI e o sistema de design (tokens) a partir do Figma | Equipe | W0 | Aberta |
| PW7 | Decidir o formato de entrega da imagem do evento (URL ou upload) conforme E12 | Dev | Antes da W5 | Aberta |
| PW8 | Definir se o cadastro faz login automático ou volta a T03 | Equipe | W1 | Aberta |
| PW9 | Informar `papel` do usuário no evento em E11/E16 se a API ainda não devolver; senão o frontend deduz por E16 e pelos 403/404 | Dev (API) | W5 | Aberta |
