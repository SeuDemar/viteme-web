import { useId, type ReactNode } from 'react'

interface CampoProps {
  rotulo: string
  erro?: string
  ajuda?: string
  cheio?: boolean
  children: (props: { id: string; 'aria-invalid': boolean; 'aria-describedby'?: string }) => ReactNode
}

/** Rótulo + controle + mensagem de erro/ajuda, ligados por aria (D-W11). */
export function Campo({ rotulo, erro, ajuda, cheio, children }: CampoProps) {
  const id = useId()
  const descricaoId = erro || ajuda ? `${id}-desc` : undefined
  return (
    <div className={`campo${cheio ? ' campo--cheio' : ''}`}>
      <label className="campo__rotulo" htmlFor={id}>
        {rotulo}
      </label>
      {children({ id, 'aria-invalid': Boolean(erro), 'aria-describedby': descricaoId })}
      {erro ? (
        <span className="campo__erro" id={descricaoId} role="alert">
          {erro}
        </span>
      ) : (
        ajuda && (
          <span className="campo__ajuda" id={descricaoId}>
            {ajuda}
          </span>
        )
      )}
    </div>
  )
}
