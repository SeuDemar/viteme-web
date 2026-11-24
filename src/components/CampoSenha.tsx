import { useState, type ComponentProps } from 'react'
import { Icone } from './Icone'

/** Campo de senha com botão próprio de mostrar/ocultar (substitui o "olhinho" nativo de alguns navegadores). */
export function CampoSenha({ className = 'entrada', ...props }: Omit<ComponentProps<'input'>, 'type'>) {
  const [visivel, setVisivel] = useState(false)
  return (
    <div className="entrada-com-acao">
      <input {...props} className={className} type={visivel ? 'text' : 'password'} />
      <button type="button" className="entrada-com-acao__botao" aria-label={visivel ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={visivel} onClick={() => setVisivel(!visivel)}>
        <Icone nome={visivel ? 'olhoRiscado' : 'olho'} tamanho={18} />
      </button>
    </div>
  )
}
