# Bugs e correções

Atualizar **durante** o desenvolvimento, não no fim (exigência da Entrega 3).

| # | Data | Onde | Descrição | Causa | Correção | Como foi achado |
|---|---|---|---|---|---|---|
| 1 | 2026-10-25 | T08 Perfil | Depois de salvar, a mensagem "Perfil atualizado." não aparecia | O formulário remontava quando o cache do perfil mudava (`key` com nome e telefone) e o estado da mensagem era perdido | `key` só com o id do perfil; teste de regressão (`fluxos.test.tsx`) | Roteiro ponta a ponta contra a API real ([validacao-api-real.md](../../docs/validacao-api-real.md)); os testes com MSW não pegaram |
| 2 | 2026-10-25 | T11 Gestão | "1 inscritos" no resumo do evento | Plural fixo | "1 inscrito" / "N inscritos" | Captura de tela da validação com a API real |
| 3 | 2026-10-25 | T10 Edição | Mensagem duplicada no erro 412 (alerta de conflito e alerta genérico juntos) | O tratamento do 412 também caía no alerta genérico | `tratarErro` retorna depois do 412 | Teste CTW17 |
| 4 | 2026-10-25 | Login | Login com senha errada dizia "Sua sessão expirou" | `mapearErro` tratava todo 401 como sessão expirada | 401 `CREDENCIAIS_INVALIDAS` usa a mensagem genérica da API | Teste CTW01 |
