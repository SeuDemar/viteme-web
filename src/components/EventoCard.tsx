import { Link } from 'react-router-dom'
import type { EventoResumo } from '../api/tipos'
import { iconeDaCategoria, tomDaCategoria } from '../lib/categorias'
import { partesDaData, precoOuGratuito } from '../lib/formatar'
import { Icone } from './Icone'
import { Selo } from './Selo'


/** Card do mural. O selo "Alterado" saiu do card a pedido da equipe; a alteração aparece em destaque no detalhe (T02). */
export function EventoCard({ evento, destaque = false }: { evento: EventoResumo; destaque?: boolean }) {
  const encerradas = evento.inscricoesAbertas === false
  const lotado = !encerradas && evento.vagasRestantes === 0
  const poucasVagas = !encerradas && !lotado && evento.vagasRestantes !== null && evento.vagasRestantes <= 20
  const data = partesDaData(evento.dataInicio)

  return (
    <Link to={`/eventos/${evento.id}`} className={`evento-card evento-card--tom-${tomDaCategoria(evento.categoria)}${destaque ? ' evento-card--destaque' : ''}`}>
      <div className={`evento-card__capa evento-card__capa--${tomDaCategoria(evento.categoria)}`}>
        {!evento.imagemUrl && (
          <span className="evento-card__arte" aria-hidden="true">
            <Icone nome={iconeDaCategoria(evento.categoria)} tamanho={destaque ? 150 : 112} />
          </span>
        )}
        {evento.imagemUrl && <img className="evento-card__imagem" src={evento.imagemUrl} alt="" loading="lazy" />}
        <span className="evento-card__data" aria-hidden="true">
          <strong>{data.dia}</strong>
          {data.mes}
        </span>
        <span className="evento-card__categoria">{evento.categoria}</span>
        {destaque && (
          <span className="evento-card__selo-destaque" aria-hidden="true">
            <Icone nome="estrela" tamanho={13} />
            Em destaque
          </span>
        )}
      </div>
      <div className="evento-card__corpo">
        <h3 className="evento-card__titulo">{evento.titulo}</h3>
        <ul className="evento-card__info">
          <li>
            <Icone nome="relogio" tamanho={16} />
            <span>
              <span className="sr-only">{data.dia} de {data.mes}, </span>
              {data.semanaEHora}
            </span>
          </li>
          <li>
            <Icone nome="local" tamanho={16} />
            <span>{evento.local}</span>
          </li>
        </ul>
        {destaque && (
          <span className="evento-card__ver" aria-hidden="true">
            Ver detalhes
            <Icone nome="seta" tamanho={16} />
          </span>
        )}
        <div className="evento-card__rodape">
          <span className={evento.preco > 0 ? 'evento-card__preco' : 'evento-card__preco evento-card__preco--gratuito'}>
            <Icone nome="etiqueta" tamanho={16} />
            {precoOuGratuito(evento.preco)}
          </span>
          <span className="linha linha--compacta">
            {encerradas ? (
              <Selo tom="neutro">Inscrições encerradas</Selo>
            ) : lotado ? (
              <Selo tom="perigo">Lotado</Selo>
            ) : (
              <Selo tom="sucesso">Inscrições abertas</Selo>
            )}
            {poucasVagas && <Selo tom="aviso">{evento.vagasRestantes === 1 ? '1 vaga' : `${evento.vagasRestantes} vagas`}</Selo>}
          </span>
        </div>
      </div>
    </Link>
  )
}
