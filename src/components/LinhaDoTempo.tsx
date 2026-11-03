import type { Atividade } from '../api/tipos'
import { dataLonga, hora } from '../lib/formatar'

/** Programação do evento como linha do tempo vertical. Eventos de mais de um dia ganham um separador por dia. */
export function LinhaDoTempo({ atividades }: { atividades: Atividade[] }) {
  const ordenadas = [...atividades].sort((a, b) => a.inicio.localeCompare(b.inicio))
  const dias = new Set(ordenadas.map((a) => new Date(a.inicio).toDateString()))
  const variosDias = dias.size > 1

  return (
    <ol className="linha-do-tempo">
      {ordenadas.map((a, i) => {
        const dia = new Date(a.inicio).toDateString()
        const novoDia = variosDias && (i === 0 || new Date(ordenadas[i - 1]!.inicio).toDateString() !== dia)
        return (
          <li key={a.id} className="linha-do-tempo__item">
            {novoDia && <p className="linha-do-tempo__dia">{dataLonga(a.inicio)}</p>}
            <time className="linha-do-tempo__hora" dateTime={a.inicio}>
              {hora(a.inicio)}
              <span className="texto-suave"> – {hora(a.fim)}</span>
            </time>
            <div className="linha-do-tempo__conteudo">
              <strong>{a.titulo}</strong>
              {(a.palestrante || a.local) && <p className="texto-suave texto-pequeno">{[a.palestrante, a.local].filter(Boolean).join(' · ')}</p>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
