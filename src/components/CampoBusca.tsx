import type { ComponentProps } from 'react'
import { Icone } from './Icone'

interface CampoBuscaProps extends Omit<ComponentProps<'input'>, 'type' | 'value' | 'onChange'> {
  value: string
  onChange: (valor: string) => void
}

/** Campo de busca com lupa e botão próprio de limpar (o "x" nativo do navegador fica escondido). */
export function CampoBusca({ value, onChange, className = 'entrada', ...props }: CampoBuscaProps) {
  return (
    <div className="entrada-com-icone">
      <Icone nome="busca" tamanho={18} />
      <input {...props} className={className} type="search" value={value} onChange={(e) => onChange(e.target.value)} />
      {value && (
        <button type="button" className="entrada-com-icone__limpar" aria-label="Limpar busca" onClick={() => onChange('')}>
          <Icone nome="fechar" tamanho={16} />
        </button>
      )}
    </div>
  )
}
