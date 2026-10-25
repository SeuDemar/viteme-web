import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Carregando } from '../components/Estados'
import { useSessao } from '../features/auth/sessao'

/** Só decide depois que a restauração da sessão (E03) terminou; sem login, vai ao login e volta à origem (CT59). */
export function RotaProtegida() {
  const { estado } = useSessao()
  const local = useLocation()

  if (estado === 'restaurando') {
    return (
      <main className="pagina" id="conteudo">
        <Carregando />
      </main>
    )
  }

  if (estado === 'anonimo') {
    return <Navigate to="/entrar" replace state={{ de: `${local.pathname}${local.search}` }} />
  }

  return <Outlet />
}
