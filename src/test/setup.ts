import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { definirToken } from '../api/cliente'
import { reiniciarRestauracaoParaTestes } from '../features/auth/sessao'
import { servidor } from './servidor'

beforeAll(() => servidor.listen({ onUnhandledFrame: 'error' }))

afterEach(() => {
  cleanup()
  servidor.resetHandlers()
  definirToken(null)
  reiniciarRestauracaoParaTestes()
})

afterAll(() => servidor.close())
