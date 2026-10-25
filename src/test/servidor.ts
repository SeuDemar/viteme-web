import { setupServer } from 'msw/node'

/** Servidor MSW compartilhado pelos testes. Cada teste registra os handlers de que precisa com `servidor.use`. */
export const servidor = setupServer()
