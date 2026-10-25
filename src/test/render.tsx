import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { SessaoProvider } from '../features/auth/sessao'
import { AppRoutes } from '../routes/AppRoutes'

function LocalAtual() {
  const local = useLocation()
  return <output data-testid="local">{`${local.pathname}${local.search}`}</output>
}

/** Renderiza o app completo (rotas + sessão + cache) a partir de uma rota. */
export function renderizarApp(rota = '/') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 0 }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <SessaoProvider>
        <MemoryRouter initialEntries={[rota]}>
          <AppRoutes />
          <LocalAtual />
        </MemoryRouter>
      </SessaoProvider>
    </QueryClientProvider>,
  )
}
