import type { ReactNode } from 'react'
import type { ErroApi } from '../lib/erros'

export function Carregando({ linhas = 3 }: { linhas?: number }) {
  return (
    <div className="carregando" role="status" aria-live="polite" aria-label="Carregando">
      {Array.from({ length: linhas }, (_, i) => (
        <div className="esqueleto" key={i} />
      ))}
      <span className="sr-only">Carregando…</span>
    </div>
  )
}

export function Vazio({ titulo, children, acao }: { titulo: string; children?: ReactNode; acao?: ReactNode }) {
  return (
    <div className="estado">
      <div className="estado__icone" aria-hidden="true">
        ✦
      </div>
      <strong>{titulo}</strong>
      {children && <p>{children}</p>}
      {acao}
    </div>
  )
}

export function Erro({ erro, aoTentarNovamente }: { erro: ErroApi; aoTentarNovamente?: () => void }) {
  return (
    <div className="estado estado--erro" role="alert">
      <div className="estado__icone" aria-hidden="true">
        !
      </div>
      <strong>Não foi possível carregar</strong>
      <p>{erro.mensagem}</p>
      {aoTentarNovamente && (
        <button type="button" className="botao botao--secundario" onClick={aoTentarNovamente}>
          Tentar novamente
        </button>
      )}
    </div>
  )
}
