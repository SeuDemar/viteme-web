import { useEffect, useId, useRef, useState, type ComponentProps, type KeyboardEvent } from 'react'
import { Icone } from './Icone'

export interface OpcaoSeletor {
  valor: string
  rotulo: string
}

interface SeletorProps {
  id?: string
  value: string
  onChange: (valor: string) => void
  onBlur?: () => void
  opcoes: OpcaoSeletor[]
  /** Texto mostrado enquanto o valor não corresponde a nenhuma opção. */
  placeholder?: string
  disabled?: boolean
  ref?: ComponentProps<'button'>['ref']
  'aria-invalid'?: boolean
  'aria-describedby'?: string
}

/**
 * Caixa de seleção própria (padrão ARIA "select-only combobox"): o foco fica no botão e a lista é navegada com
 * setas, Home/End e digitação; Enter ou Espaço escolhe, Escape fecha. Substitui o `<select>` nativo.
 */
export function Seletor({ id, value, onChange, onBlur, opcoes, placeholder = 'Selecione', disabled, ref, ...aria }: SeletorProps) {
  const idLista = useId()
  const [aberto, setAberto] = useState(false)
  const [ativa, setAtiva] = useState(0)
  const [acima, setAcima] = useState(false)
  const raiz = useRef<HTMLDivElement>(null)
  const botao = useRef<HTMLButtonElement | null>(null)
  const digitado = useRef({ texto: '', quando: 0 })

  const selecionado = opcoes.findIndex((o) => o.valor === value)
  const rotulo = selecionado >= 0 ? opcoes[selecionado]!.rotulo : undefined

  const abrir = () => {
    const caixa = raiz.current?.getBoundingClientRect()
    if (caixa) {
      const abaixo = window.innerHeight - caixa.bottom
      setAcima(abaixo < Math.min(260, opcoes.length * 42 + 12) + 12 && caixa.top > abaixo)
    }
    setAtiva(Math.max(selecionado, 0))
    setAberto(true)
  }

  const escolher = (indice: number) => {
    const opcao = opcoes[indice]
    if (!opcao) return
    onChange(opcao.valor)
    setAberto(false)
    botao.current?.focus()
  }

  useEffect(() => {
    if (!aberto) return
    const fora = (e: MouseEvent) => {
      if (!raiz.current?.contains(e.target as Node)) setAberto(false)
    }
    document.addEventListener('mousedown', fora)
    return () => document.removeEventListener('mousedown', fora)
  }, [aberto])

  // Mantém a opção ativa à vista quando a lista rola.
  useEffect(() => {
    if (aberto) document.getElementById(`${idLista}-${ativa}`)?.scrollIntoView?.({ block: 'nearest' })
  }, [aberto, ativa, idLista])

  const aoTeclar = (e: KeyboardEvent<HTMLButtonElement>) => {
    const ultimo = opcoes.length - 1
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        if (aberto) setAtiva(Math.min(ativa + 1, ultimo))
        else abrir()
        return
      case 'ArrowUp':
        e.preventDefault()
        if (aberto) setAtiva(Math.max(ativa - 1, 0))
        else abrir()
        return
      case 'Home':
        if (aberto) {
          e.preventDefault()
          setAtiva(0)
        }
        return
      case 'End':
        if (aberto) {
          e.preventDefault()
          setAtiva(ultimo)
        }
        return
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (aberto) escolher(ativa)
        else abrir()
        return
      case 'Escape':
        if (aberto) {
          e.preventDefault()
          e.stopPropagation()
          setAberto(false)
        }
        return
      case 'Tab':
        setAberto(false)
        return
    }
    // Digitar letras salta para a opção que começa com elas.
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const agora = Date.now()
      const anterior = digitado.current
      const texto = (agora - anterior.quando < 700 ? anterior.texto : '') + e.key.toLowerCase()
      digitado.current = { texto, quando: agora }
      const achada = opcoes.findIndex((o) => o.rotulo.toLowerCase().startsWith(texto))
      if (achada >= 0) {
        if (!aberto) setAberto(true)
        setAtiva(achada)
      }
    }
  }

  return (
    <div className="seletor" ref={raiz}>
      <button
        {...aria}
        ref={(no) => {
          botao.current = no
          if (typeof ref === 'function') ref(no)
          else if (ref) ref.current = no
        }}
        id={id}
        type="button"
        role="combobox"
        className="entrada seletor__botao"
        data-vazio={!rotulo}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={aberto}
        aria-controls={idLista}
        aria-activedescendant={aberto ? `${idLista}-${ativa}` : undefined}
        onClick={() => (aberto ? setAberto(false) : abrir())}
        onKeyDown={aoTeclar}
        onBlur={(e) => {
          if (aberto && !raiz.current?.contains(e.relatedTarget as Node | null)) setAberto(false)
          onBlur?.()
        }}
      >
        <span className="seletor__texto">{rotulo ?? placeholder}</span>
        <Icone nome="baixo" tamanho={18} />
      </button>
      {aberto && (
        <ul className={acima ? 'seletor__lista seletor__lista--acima' : 'seletor__lista'} id={idLista} role="listbox">
          {opcoes.map((o, i) => (
            <li
              key={o.valor}
              id={`${idLista}-${i}`}
              role="option"
              aria-selected={i === selecionado}
              data-ativa={i === ativa}
              className="seletor__opcao"
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setAtiva(i)}
              onClick={() => escolher(i)}
            >
              <span>{o.rotulo}</span>
              {i === selecionado && <Icone nome="check" tamanho={16} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
