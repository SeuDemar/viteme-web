/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base da API com o prefixo /api/v1. */
  readonly VITE_API_URL?: string
  /** "true" mostra, em T06, os botões de simulação do gateway (somente demonstração). */
  readonly VITE_SIMULADOR_PAGAMENTO?: string
  /** Intervalo do polling de pagamento em ms (padrão 5000). */
  readonly VITE_POLL_PAGAMENTO_MS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
