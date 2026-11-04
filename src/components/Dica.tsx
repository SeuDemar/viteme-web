import type { ReactNode } from 'react'

/** Dica de ferramenta própria: aparece ao passar o mouse ou focar o controle (substitui o `title` nativo). */
export function Dica({ texto, children }: { texto: string; children: ReactNode }) {
  return (
    <span className="dica" data-dica={texto}>
      {children}
    </span>
  )
}
