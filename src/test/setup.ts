import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { definirToken } from '../api/cliente'
import { reiniciarRestauracaoParaTestes } from '../features/auth/sessao'
import { servidor } from './servidor'

// Com todos os arquivos em paralelo, a primeira renderização de uma tela às vezes passa de 1 s (o padrão de findBy/waitFor)
// e testes corretos falhavam de forma intermitente. Isolados, passavam.
configure({ asyncUtilTimeout: 5000 })

beforeAll(() => servidor.listen({ onUnhandledFrame: 'error' }))

afterEach(() => {
  cleanup()
  servidor.resetHandlers()
  definirToken(null)
  reiniciarRestauracaoParaTestes()
})

afterAll(() => servidor.close())
