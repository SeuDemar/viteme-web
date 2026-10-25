import { QueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'

export function criarQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 20_000,
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
