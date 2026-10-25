import { useQuery } from '@tanstack/react-query'
import { Suspense, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { listarNotificacoes } from '../api/notificacoes'
import { useSessao } from '../features/auth/sessao'
import { Carregando } from './Estados'
import { Icone, type NomeIcone } from './Icone'
import { LimiteDeErro } from './LimiteDeErro'

const LINKS = [
  { para: '/', rotulo: 'Explorar eventos', fim: true },
  { para: '/minhas-inscricoes', rotulo: 'Minhas inscrições' },
  { para: '/meus-eventos', rotulo: 'Meus eventos' },
  { para: '/notificacoes', rotulo: 'Notificações', notificacoes: true },
  { para: '/perfil', rotulo: 'Perfil' },
]

const ABAS: { para: string; rotulo: string; icone: NomeIcone; fim?: boolean }[] = [
  { para: '/', rotulo: 'Início', icone: 'inicio', fim: true },
  { para: '/minhas-inscricoes', rotulo: 'Inscrições', icone: 'inscricoes' },
  { para: '/meus-eventos', rotulo: 'Eventos', icone: 'eventos' },
  { para: '/perfil', rotulo: 'Perfil', icone: 'perfil' },
]

/** Sino do cabeçalho: E34 com lidas=false a cada 60 s e ao voltar o foco para a aba (PDF, 5.6 g). */
function useNaoLidas() {
  const { estado } = useSessao()
  const consulta = useQuery({
    queryKey: ['notificacoes', 'nao-lidas'],
    queryFn: () => listarNotificacoes({ lidas: false, tamanhoPagina: 1 }),
    enabled: estado === 'autenticado',
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  })
  return consulta.data?.naoLidas ?? 0
}

function Menu({ naoLidas, aoNavegar }: { naoLidas: number; aoNavegar?: () => void }) {
  return (
    <>
      {LINKS.map((l) => (
        <NavLink key={l.para} to={l.para} end={l.fim} className="menu__link" onClick={aoNavegar}>
          {l.rotulo}
          {l.notificacoes && naoLidas > 0 && (
            <span className="contador" aria-label={`${naoLidas} não lidas`}>
              {naoLidas > 99 ? '99+' : naoLidas}
            </span>
          )}
        </NavLink>
      ))}
    </>
  )
}

function Cabecalho() {
  const { estado, usuario, logout } = useSessao()
  const naoLidas = useNaoLidas()
  // A gaveta fecha sozinha ao navegar: guardamos a rota em que foi aberta.
  const local = useLocation()
  const [abertoEm, setAbertoEm] = useState<string | null>(null)
  const aberto = abertoEm === local.pathname
  const setAberto = (valor: boolean) => setAbertoEm(valor ? local.pathname : null)
  const navegar = useNavigate()

  const sair = async () => {
    await logout()
    navegar('/')
  }

  const acoes =
    estado === 'autenticado' ? (
      <>
        <span className="cabecalho__usuario">{usuario?.nome}</span>
        <button type="button" className="botao botao--contorno botao--pequeno" onClick={sair}>
          Sair
        </button>
      </>
    ) : (
      estado === 'anonimo' && (
        <>
          <Link to="/entrar" className="botao botao--contorno botao--pequeno">
            Entrar
          </Link>
          <Link to="/cadastro" className="botao botao--pequeno">
            Criar conta
          </Link>
        </>
      )
    )

  return (
    <header className="cabecalho">
      <div className="cabecalho__interno">
        <Link to="/" className="logo" aria-label="Viteme, página inicial">
          Viteme
        </Link>
        <nav className="menu" aria-label="Principal">
          <Menu naoLidas={naoLidas} />
        </nav>
        <div className="cabecalho__acoes">{acoes}</div>
        <button type="button" className="hamburguer" aria-label={aberto ? 'Fechar menu' : 'Abrir menu'} aria-expanded={aberto} aria-controls="gaveta" onClick={() => setAberto(!aberto)}>
          <span />
        </button>
      </div>
      {aberto && (
        <nav className="gaveta" id="gaveta" aria-label="Menu">
          <Menu naoLidas={naoLidas} aoNavegar={() => setAberto(false)} />
          <div className="gaveta__acoes">{acoes}</div>
        </nav>
      )}
    </header>
  )
}

export function Layout() {
  const local = useLocation()
  return (
    <>
      <a className="pular-conteudo" href="#conteudo">
        Pular para o conteúdo
      </a>
      <Cabecalho />
      <LimiteDeErro key={local.pathname}>
        <Suspense
          fallback={
            <main className="pagina" id="conteudo">
              <Carregando />
            </main>
          }
        >
          <Outlet />
        </Suspense>
      </LimiteDeErro>
      <nav className="barra-abas" aria-label="Navegação rápida">
        {ABAS.map((a) => (
          <NavLink key={a.para} to={a.para} end={a.fim} className="barra-abas__link">
            <span className="barra-abas__icone">
              <Icone nome={a.icone} />
            </span>
            {a.rotulo}
          </NavLink>
        ))}
      </nav>
    </>
  )
}
