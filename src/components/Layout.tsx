import { useQuery } from '@tanstack/react-query'
import { Suspense, useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { listarNotificacoes } from '../api/notificacoes'
import { useSessao } from '../features/auth/sessao'
import { Carregando } from './Estados'
import { Icone, type NomeIcone } from './Icone'
import { LimiteDeErro } from './LimiteDeErro'

// Notificações e perfil saíram do menu de texto: viraram ícones à direita (pedido da equipe).
const LINKS = [
  { para: '/', rotulo: 'Explorar eventos', fim: true },
  { para: '/minhas-inscricoes', rotulo: 'Minhas inscrições' },
  { para: '/meus-eventos', rotulo: 'Meus eventos' },
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

const iniciais = (nome: string) =>
  nome
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')

function Sino({ naoLidas }: { naoLidas: number }) {
  const rotulo = naoLidas > 0 ? `Notificações, ${naoLidas} não lidas` : 'Notificações'
  return (
    <NavLink to="/notificacoes" className="botao-icone" aria-label={rotulo} title="Notificações">
      <Icone nome="sino" />
      {naoLidas > 0 && (
        <span className="contador contador--flutuante" aria-hidden="true">
          {naoLidas > 99 ? '99+' : naoLidas}
        </span>
      )}
    </NavLink>
  )
}

/** Avatar com as iniciais; abre um menu curto com o perfil e a saída. */
function MenuConta({ nome, email, aoSair }: { nome: string; email?: string; aoSair: () => void }) {
  const [aberto, setAberto] = useState(false)
  const raiz = useRef<HTMLDivElement>(null)
  const botao = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!aberto) return
    const foraDoMenu = (e: MouseEvent) => {
      if (!raiz.current?.contains(e.target as Node)) setAberto(false)
    }
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAberto(false)
        botao.current?.focus()
      }
    }
    document.addEventListener('mousedown', foraDoMenu)
    document.addEventListener('keydown', tecla)
    return () => {
      document.removeEventListener('mousedown', foraDoMenu)
      document.removeEventListener('keydown', tecla)
    }
  }, [aberto])

  return (
    <div className="conta" ref={raiz}>
      <button
        ref={botao}
        type="button"
        className="avatar"
        aria-label={`Conta de ${nome}`}
        aria-haspopup="true"
        aria-expanded={aberto}
        aria-controls="menu-conta"
        title={nome}
        onClick={() => setAberto(!aberto)}
      >
        {iniciais(nome) || <Icone nome="perfil" tamanho={18} />}
      </button>
      {aberto && (
        <div className="conta__menu" id="menu-conta">
          <div className="conta__cabecalho">
            <strong>{nome}</strong>
            {email && <span>{email}</span>}
          </div>
          <Link to="/perfil" className="conta__item" onClick={() => setAberto(false)}>
            <Icone nome="perfil" tamanho={18} />
            Meu perfil
          </Link>
          <button
            type="button"
            className="conta__item"
            onClick={() => {
              setAberto(false)
              aoSair()
            }}
          >
            <Icone nome="sair" tamanho={18} />
            Sair
          </button>
        </div>
      )}
    </div>
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
  const autenticado = estado === 'autenticado'

  const sair = async () => {
    await logout()
    navegar('/')
  }

  const entrar = estado === 'anonimo' && (
    <>
      <Link to="/entrar" className="botao botao--contorno botao--pequeno">
        Entrar
      </Link>
      <Link to="/cadastro" className="botao botao--pequeno">
        Criar conta
      </Link>
    </>
  )

  return (
    <header className="cabecalho">
      <div className="cabecalho__interno">
        <Link to="/" className="logo" aria-label="Viteme, página inicial">
          Viteme
        </Link>
        <nav className="menu" aria-label="Principal">
          {LINKS.map((l) => (
            <NavLink key={l.para} to={l.para} end={l.fim} className="menu__link">
              {l.rotulo}
            </NavLink>
          ))}
        </nav>
        <div className="cabecalho__acoes">
          {autenticado && usuario ? (
            <>
              <Sino naoLidas={naoLidas} />
              <span className="so-desktop">
                <MenuConta nome={usuario.nome} email={usuario.email} aoSair={sair} />
              </span>
            </>
          ) : (
            <span className="so-desktop linha">{entrar}</span>
          )}
          <button type="button" className="hamburguer" aria-label={aberto ? 'Fechar menu' : 'Abrir menu'} aria-expanded={aberto} aria-controls="gaveta" onClick={() => setAberto(!aberto)}>
            <span />
          </button>
        </div>
      </div>
      {aberto && (
        <nav className="gaveta" id="gaveta" aria-label="Menu">
          {LINKS.map((l) => (
            <NavLink key={l.para} to={l.para} end={l.fim} className="menu__link" onClick={() => setAberto(false)}>
              {l.rotulo}
            </NavLink>
          ))}
          {autenticado && (
            <>
              <NavLink to="/notificacoes" className="menu__link" onClick={() => setAberto(false)}>
                Notificações
                {naoLidas > 0 && <span className="contador">{naoLidas > 99 ? '99+' : naoLidas}</span>}
              </NavLink>
              <NavLink to="/perfil" className="menu__link" onClick={() => setAberto(false)}>
                Perfil
              </NavLink>
            </>
          )}
          <div className="gaveta__acoes">
            {autenticado && usuario ? (
              <>
                <span className="texto-suave texto-pequeno">{usuario.nome}</span>
                <button type="button" className="botao botao--contorno" onClick={sair}>
                  <Icone nome="sair" tamanho={18} />
                  Sair
                </button>
              </>
            ) : (
              entrar
            )}
          </div>
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
      <footer className="rodape">
        <div className="rodape__marca">
          <strong>Viteme</strong>
          <span>Divulgação, inscrição e acompanhamento dos eventos da faculdade.</span>
        </div>
        <nav className="rodape__links" aria-label="Rodapé">
          <Link to="/certificados">Conferir autenticidade de certificado</Link>
        </nav>
        <small>© {new Date().getFullYear()} Viteme</small>
      </footer>
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
