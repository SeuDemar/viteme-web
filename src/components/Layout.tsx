import { useQuery } from '@tanstack/react-query'
import { Suspense, useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { listarNotificacoes } from '../api/notificacoes'
import { useSessao } from '../features/auth/sessao'
import { useTema } from '../lib/tema'
import { Dica } from './Dica'
import { Carregando } from './Estados'
import { Icone, type NomeIcone } from './Icone'
import { LimiteDeErro } from './LimiteDeErro'
import { LogoMarca } from './LogoMarca'

// Notificações e perfil saíram do menu de texto: viraram ícones à direita (pedido da equipe).
// "Meus eventos" (área do organizador) só aparece com a sessão iniciada.
const LINKS: { para: string; rotulo: string; icone: NomeIcone; fim?: boolean; soLogado?: boolean }[] = [
  { para: '/', rotulo: 'Explorar eventos', icone: 'busca', fim: true },
  { para: '/minhas-inscricoes', rotulo: 'Minhas inscrições', icone: 'inscricoes' },
  { para: '/meus-eventos', rotulo: 'Meus eventos', icone: 'eventos', soLogado: true },
]

const ABAS: { para: string; rotulo: string; icone: NomeIcone; fim?: boolean; soLogado?: boolean }[] = [
  { para: '/', rotulo: 'Início', icone: 'inicio', fim: true },
  { para: '/minhas-inscricoes', rotulo: 'Inscrições', icone: 'inscricoes' },
  { para: '/meus-eventos', rotulo: 'Eventos', icone: 'eventos', soLogado: true },
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

/** Alterna entre tema claro e escuro; a escolha fica guardada neste aparelho. */
function BotaoTema() {
  const { tema, alternar } = useTema()
  const rotulo = tema === 'escuro' ? 'Ativar tema claro' : 'Ativar tema escuro'
  return (
    <Dica texto={rotulo}>
      <button type="button" className="botao-icone" aria-label={rotulo} onClick={alternar}>
        <Icone nome={tema === 'escuro' ? 'sol' : 'lua'} />
      </button>
    </Dica>
  )
}

function Sino({ naoLidas }: { naoLidas: number }) {
  const rotulo = naoLidas > 0 ? `Notificações, ${naoLidas} não lidas` : 'Notificações'
  return (
    <Dica texto="Notificações">
      <NavLink to="/notificacoes" className="botao-icone" aria-label={rotulo}>
        <Icone nome="sino" />
        {naoLidas > 0 && (
          <span className="contador contador--flutuante" aria-hidden="true">
            {naoLidas > 99 ? '99+' : naoLidas}
          </span>
        )}
      </NavLink>
    </Dica>
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
      <Dica texto={nome}>
        <button
          ref={botao}
          type="button"
          className="avatar"
          aria-label={`Conta de ${nome}`}
          aria-haspopup="true"
          aria-expanded={aberto}
          aria-controls="menu-conta"
          onClick={() => setAberto(!aberto)}
        >
          {iniciais(nome) || <Icone nome="perfil" tamanho={18} />}
        </button>
      </Dica>
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
  const links = LINKS.filter((l) => !l.soLogado || autenticado)

  const sair = async () => {
    await logout()
    navegar('/')
  }

  const entrar = estado === 'anonimo' && (
    <>
      <Link to="/entrar" className="botao botao--contorno botao--pequeno">
        <Icone nome="perfil" tamanho={16} />
        Entrar
      </Link>
      <Link to="/cadastro" className="botao botao--pequeno">
        <Icone nome="mais" tamanho={16} />
        Criar conta
      </Link>
    </>
  )

  return (
    <header className="cabecalho">
      <div className="cabecalho__interno">
        <Link to="/" className="logo" aria-label="Viteme, página inicial">
          <LogoMarca altura={32} />
          Viteme
        </Link>
        <nav className="menu" aria-label="Principal">
          {links.map((l) => (
            <NavLink key={l.para} to={l.para} end={l.fim} className="menu__link">
              <Icone nome={l.icone} tamanho={18} />
              {l.rotulo}
            </NavLink>
          ))}
        </nav>
        <div className="cabecalho__acoes">
          <BotaoTema />
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
          {links.map((l) => (
            <NavLink key={l.para} to={l.para} end={l.fim} className="menu__link" onClick={() => setAberto(false)}>
              <Icone nome={l.icone} tamanho={20} />
              {l.rotulo}
            </NavLink>
          ))}
          {autenticado && (
            <>
              <NavLink to="/notificacoes" className="menu__link" onClick={() => setAberto(false)}>
                <Icone nome="sino" tamanho={20} />
                Notificações
                {naoLidas > 0 && <span className="contador">{naoLidas > 99 ? '99+' : naoLidas}</span>}
              </NavLink>
              <NavLink to="/perfil" className="menu__link" onClick={() => setAberto(false)}>
                <Icone nome="perfil" tamanho={20} />
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
  const { estado } = useSessao()
  const abas = ABAS.filter((a) => !a.soLogado || estado === 'autenticado')
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
          <strong>
            <LogoMarca altura={26} />
            Viteme
          </strong>
          <span>Divulgação, inscrição e acompanhamento dos eventos da faculdade.</span>
        </div>
        <nav className="rodape__links" aria-label="Rodapé">
          <Link to="/certificados">
            <Icone nome="certificado" tamanho={16} />
            Conferir autenticidade de certificado
          </Link>
        </nav>
        <small>© {new Date().getFullYear()} Viteme</small>
      </footer>
      <nav className="barra-abas" aria-label="Navegação rápida">
        {abas.map((a) => (
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
