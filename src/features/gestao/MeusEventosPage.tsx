import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { listarMeusEventos } from '../../api/eventos'
import type { EventoMeu, PapelEvento } from '../../api/tipos'
import { Carregando, Erro, Vazio } from '../../components/Estados'
import { SeloStatusEvento } from '../../components/Selo'
import { dataCurta } from '../../lib/formatar'
import { mapearErro } from '../../lib/erros'
import { useTitulo } from '../../lib/formulario'

type Filtro = 'todos' | Exclude<PapelEvento, 'PARTICIPANTE'>

const ROTULO_PAPEL: Record<PapelEvento, string> = { ORGANIZADOR: 'Organizador', COLABORADOR: 'Colaborador', PARTICIPANTE: 'Participante' }

function textoInscritos({ inscritos, capacidade }: EventoMeu): string | null {
  if (inscritos === undefined) return null
  const texto = inscritos === 1 ? '1 inscrito' : `${inscritos} inscritos`
  if (capacidade === null || capacidade === undefined) return texto
  const vagas = Math.max(capacidade - inscritos, 0)
  return `${texto} • ${vagas === 1 ? '1 vaga' : `${vagas} vagas`}`
}

function ItemEvento({ evento }: { evento: EventoMeu }) {
  const organizador = evento.papel === 'ORGANIZADOR'
  const inscritos = evento.status === 'RASCUNHO' ? null : textoInscritos(evento)
  const editavel = organizador && (evento.status === 'RASCUNHO' || evento.status === 'PUBLICADO' || evento.status === 'OCULTO')
  return (
    <li style={{ padding: 0, border: 0 }}>
      <article className="cartao">
        <div className="linha linha--entre" style={{ alignItems: 'flex-start' }}>
          <div>
            <h3 className="cartao__titulo">{evento.titulo}</h3>
            <p className="cartao__meta">
              {ROTULO_PAPEL[evento.papel]} • {evento.status === 'RASCUNHO' ? 'Em edição' : dataCurta(evento.dataInicio)} • {evento.local}
            </p>
            {inscritos && <p className="cartao__meta">{inscritos}</p>}
          </div>
          <SeloStatusEvento status={evento.status} />
        </div>
        <div className="linha espaco-topo">
          <Link to={`/meus-eventos/${evento.id}`} className="botao botao--secundario botao--pequeno">
            Gerenciar evento
          </Link>
          {editavel && (
            <Link to={`/meus-eventos/${evento.id}/editar`} className="botao botao--contorno botao--pequeno">
              Editar
            </Link>
          )}
          {evento.status === 'PUBLICADO' && (
            <Link to={`/eventos/${evento.id}`} className="botao-link texto-pequeno">
              Ver página pública
            </Link>
          )}
        </div>
      </article>
    </li>
  )
}

export function MeusEventosPage() {
  useTitulo('Meus eventos')
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const consulta = useQuery({
    queryKey: ['meus-eventos', filtro],
    queryFn: () => listarMeusEventos(filtro === 'todos' ? undefined : filtro),
  })

  return (
    <main className="pagina pagina--media" id="conteudo">
      <div className="linha linha--entre">
        <h1 className="pagina__titulo">Meus eventos</h1>
        <Link to="/meus-eventos/novo" className="botao">
          + Novo evento
        </Link>
      </div>

      <div className="abas espaco-topo" role="tablist" aria-label="Meu papel">
        {(
          [
            ['todos', 'Todos'],
            ['ORGANIZADOR', 'Organizo'],
            ['COLABORADOR', 'Colaboro'],
          ] as const
        ).map(([valor, rotulo]) => (
          <button key={valor} type="button" role="tab" className="aba" aria-selected={filtro === valor} onClick={() => setFiltro(valor)}>
            {rotulo}
          </button>
        ))}
      </div>

      <div className="espaco-topo">
        {consulta.isPending ? (
          <Carregando />
        ) : consulta.isError ? (
          <Erro erro={mapearErro(consulta.error)} aoTentarNovamente={() => consulta.refetch()} />
        ) : consulta.data.length === 0 ? (
          <Vazio
            titulo="Você ainda não tem eventos"
            acao={
              <Link to="/meus-eventos/novo" className="botao">
                Criar meu primeiro evento
              </Link>
            }
          >
            Crie um evento ou aguarde um convite para colaborar.
          </Vazio>
        ) : (
          <ul className="lista-simples" style={{ gap: 14 }}>
            {consulta.data.map((e) => (
              <ItemEvento key={e.id} evento={e} />
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}
