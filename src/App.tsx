import { QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { SessaoProvider } from './features/auth/sessao'
import { criarQueryClient } from './lib/queryClient'
import { AppRoutes } from './routes/AppRoutes'

export default function App() {
  const [queryClient] = useState(criarQueryClient)
  return (
    <QueryClientProvider client={queryClient}>
      <SessaoProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </SessaoProvider>
    </QueryClientProvider>
  )
}
