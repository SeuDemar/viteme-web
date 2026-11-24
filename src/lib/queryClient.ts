import { QueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'

export function criarQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Dados "frescos" por 30 s (sem pedir de novo) e guardados na memória por 30 min: voltar a uma tela ou a um filtro já
        // visto mostra tudo na hora e, se estiver velho, atualiza em segundo plano sem esqueleto de carregamento.
        staleTime: 30_000,
        gcTime: 30 * 60_000,
        refetchOnWindowFocus: false,
        // Erros 4xx são respostas definitivas da API; só falhas de rede e 5xx merecem nova tentativa.
        retry: (tentativas, erro) => {
          const status = isAxiosError(erro) ? erro.response?.status : undefined
          if (status && status < 500) return false
          return tentativas < 2
        },
      },
    },
  })
}
