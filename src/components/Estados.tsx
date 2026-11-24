import type { ReactNode } from 'react'
import type { ErroApi } from '../lib/erros'

function Ilustracao({ erro = false }: { erro?: boolean }) {
  return (
    <svg className={erro ? 'estado__ilustracao estado__ilustracao--erro' : 'estado__ilustracao'} viewBox="0 0 160 120" fill="none" aria-hidden="true" focusable="false">
      <ellipse cx="80" cy="108" rx="52" ry="6" fill="currentColor" opacity="0.12" />
      <rect x="32" y="22" width="96" height="78" rx="14" fill="currentColor" opacity="0.1" />
      <rect x="32" y="22" width="96" height="78" rx="14" stroke="currentColor" strokeWidth="3" />
      <path d="M32 46h96" stroke="currentColor" strokeWidth="3" />
      <path d="M54 14v18M106 14v18" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      {erro ? (
        <path d="M80 60v16m0 8v.5" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      ) : (
        <path d="m80 56 4.5 9.5 10.5 1.3-7.7 7.2 2 10.4L80 79l-9.3 5.4 2-10.4-7.7-7.2 10.5-1.3L80 56Z" fill="currentColor" opacity="0.85" />
      )}
      <circle cx="136" cy="30" r="4" fill="var(--cor-destaque)" />
      <circle cx="24" cy="84" r="3" fill="var(--cor-destaque)" opacity="0.7" />
    </svg>
  )
}

/** Esqueletos com o formato dos cards do mural, para a lista não "pular" quando os dados chegam. */
export function CarregandoCards({ cartoes = 6 }: { cartoes?: number }) {
  return (
    <div role="status" aria-live="polite" aria-label="Carregando">
      <ul className="grade-eventos" aria-hidden="true">
        {Array.from({ length: cartoes }, (_, i) => (
          <li key={i}>
            <div className="esqueleto-card">
              <div className="esqueleto esqueleto-card__capa" />
              <div className="esqueleto-card__corpo">
                <div className="esqueleto" style={{ width: '80%' }} />
                <div className="esqueleto" style={{ width: '55%' }} />
                <div className="esqueleto" style={{ width: '40%' }} />
              </div>
            </div>
          </li>
        ))}
      </ul>
      <span className="sr-only">Carregando…</span>
    </div>
  )
}

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
      <Ilustracao />
      <strong>{titulo}</strong>
      {children && <p>{children}</p>}
      {acao}
    </div>
  )
}

export function Erro({ erro, aoTentarNovamente }: { erro: ErroApi; aoTentarNovamente?: () => void }) {
  return (
    <div className="estado estado--erro" role="alert">
      <Ilustracao erro />
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
