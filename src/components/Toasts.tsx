import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Icone } from './Icone'

type Tom = 'sucesso' | 'erro' | 'info'
interface Toast {
  id: number
  tom: Tom
  texto: string
}
interface ApiToasts {
  sucesso: (texto: string) => void
  erro: (texto: string) => void
  info: (texto: string) => void
}

const DURACAO_MS = 5000
const MAXIMO = 3

const Contexto = createContext<ApiToasts | null>(null)

/** Avisos rápidos no canto da tela. Sucesso e informação são anunciados com calma; erro, na hora (alert). */
export function ProvedorDeToasts({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const proximoId = useRef(1)

  const fechar = useCallback((id: number) => setToasts((lista) => lista.filter((t) => t.id !== id)), [])
  const mostrar = useCallback((tom: Tom, texto: string) => {
    const id = proximoId.current++
    // O mesmo texto repetido (dois cliques seguidos) não empilha.
    setToasts((lista) => [...lista.filter((t) => t.texto !== texto), { id, tom, texto }].slice(-MAXIMO))
  }, [])

  const api = useMemo<ApiToasts>(
    () => ({ sucesso: (t) => mostrar('sucesso', t), erro: (t) => mostrar('erro', t), info: (t) => mostrar('info', t) }),
    [mostrar],
  )

  return (
    <Contexto.Provider value={api}>
      {children}
      {/* A região existe desde o início: leitores de tela só anunciam mudanças em regiões vivas já presentes. */}
      <div className="toasts" role="region" aria-label="Avisos" aria-live="polite" aria-relevant="additions">
        {toasts.map((t) => (
          <ItemToast key={t.id} toast={t} aoFechar={fechar} />
        ))}
      </div>
    </Contexto.Provider>
  )
}

function ItemToast({ toast, aoFechar }: { toast: Toast; aoFechar: (id: number) => void }) {
  const [pausado, setPausado] = useState(false)
  // Some sozinho depois de alguns segundos; parado enquanto o mouse ou o foco estão nele.
  useEffect(() => {
    if (pausado) return
    const id = setTimeout(() => aoFechar(toast.id), DURACAO_MS)
    return () => clearTimeout(id)
  }, [pausado, aoFechar, toast.id])

  return (
    <div
      className={`toast toast--${toast.tom}`}
      role={toast.tom === 'erro' ? 'alert' : undefined}
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocus={() => setPausado(true)}
      onBlur={() => setPausado(false)}
    >
      <span className="toast__icone">
        <Icone nome={toast.tom === 'sucesso' ? 'check' : toast.tom === 'erro' ? 'alerta' : 'sino'} tamanho={18} />
      </span>
      <p className="toast__texto">{toast.texto}</p>
      <button type="button" className="toast__fechar" aria-label="Fechar aviso" onClick={() => aoFechar(toast.id)}>
        <Icone nome="fechar" tamanho={16} />
      </button>
    </div>
  )
}

export function useToast(): ApiToasts {
  const api = useContext(Contexto)
  if (!api) throw new Error('useToast precisa estar dentro de <ProvedorDeToasts>.')
  return api
}
