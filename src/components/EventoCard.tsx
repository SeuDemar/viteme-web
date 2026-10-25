import { Link } from 'react-router-dom'
import type { EventoResumo } from '../api/tipos'
import { dataCurta, precoOuGratuito } from '../lib/formatar'
import { Selo } from './Selo'

export function EventoCard({ evento }: { evento: EventoResumo }) {
  const lotado = evento.vagasRestantes === 0
  return (
    <Link to={`/eventos/${evento.id}`} className="cartao evento-card">
      {evento.imagemUrl && <img className="evento-card__imagem" src={evento.imagemUrl} alt="" loading="lazy" />}
      <div className="evento-card__corpo">
        <h3 className="cartao__titulo">{evento.titulo}</h3>
        <p className="cartao__meta">
          {dataCurta(evento.dataInicio)} • {evento.local} • {precoOuGratuito(evento.preco)}
        </p>
        <div className="evento-card__rodape">
          {lotado ? <Selo tom="perigo">Lotado</Selo> : <Selo>Inscrições abertas</Selo>}
          {evento.alteradoRecentemente && <Selo tom="aviso">Alterado</Selo>}
          {!lotado && evento.vagasRestantes !== null && evento.vagasRestantes <= 20 && (
            <Selo tom="neutro">{evento.vagasRestantes === 1 ? '1 vaga' : `${evento.vagasRestantes} vagas`}</Selo>
          )}
          <Selo tom="neutro">{evento.categoria}</Selo>
        </div>
      </div>
    </Link>
  )
}

