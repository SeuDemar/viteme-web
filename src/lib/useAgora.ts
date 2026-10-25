import { useEffect, useState } from 'react'

/** Data atual que se atualiza a cada `intervaloMs` (contadores de reserva e de reenvio de código). */
export function useAgora(intervaloMs = 30_000) {
  const [agora, setAgora] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setAgora(new Date()), intervaloMs)
    return () => clearInterval(id)
  }, [intervaloMs])
  return agora
}
