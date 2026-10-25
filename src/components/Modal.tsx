import { useEffect, useId, useRef, type ReactNode } from 'react'

interface ModalProps {
  titulo: string
  aoFechar: () => void
  children: ReactNode
  acoes?: ReactNode
}

export function Modal({ titulo, aoFechar, children, acoes }: ModalProps) {
  const tituloId = useId()
  const caixa = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null
    caixa.current?.focus()
    const aoTeclar = (e: KeyboardEvent) => e.key === 'Escape' && aoFechar()
    document.addEventListener('keydown', aoTeclar)
    return () => {
      document.removeEventListener('keydown', aoTeclar)
      anterior?.focus()
    }
  }, [aoFechar])

  return (
    <div className="modal-fundo" onMouseDown={(e) => e.target === e.currentTarget && aoFechar()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby={tituloId} tabIndex={-1} ref={caixa}>
        <h2 className="modal__titulo" id={tituloId}>
          {titulo}
        </h2>
        {children}
        {acoes && <div className="modal__acoes">{acoes}</div>}
      </div>
    </div>
  )
}

interface ConfirmacaoProps {
  titulo: string
  mensagem: ReactNode
  rotuloConfirmar: string
  perigo?: boolean
  carregando?: boolean
  aoConfirmar: () => void
  aoFechar: () => void
}

export function Confirmacao({ titulo, mensagem, rotuloConfirmar, perigo, carregando, aoConfirmar, aoFechar }: ConfirmacaoProps) {
  return (
    <Modal
      titulo={titulo}
      aoFechar={aoFechar}
      acoes={
        <>
          <button type="button" className="botao botao--contorno" onClick={aoFechar}>
            Voltar
          </button>
          <button type="button" className={`botao${perigo ? ' botao--perigo' : ''}`} onClick={aoConfirmar} disabled={carregando}>
            {carregando ? 'Aguarde…' : rotuloConfirmar}
          </button>
        </>
      }
    >
      <p className="texto-suave">{mensagem}</p>
    </Modal>
  )
}
