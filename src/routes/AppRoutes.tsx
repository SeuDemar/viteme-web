import { lazy } from 'react'
import { Link, Route, Routes } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { useTitulo } from '../lib/formulario'
import { MuralPage } from '../features/eventos/MuralPage'
import { RotaProtegida } from './RotaProtegida'

// O mural (página inicial) vai no pacote principal; as demais telas são carregadas sob demanda.
const CadastroPage = lazy(() => import('../features/auth/CadastroPage').then((m) => ({ default: m.CadastroPage })))
const LoginPage = lazy(() => import('../features/auth/LoginPage').then((m) => ({ default: m.LoginPage })))
const DetalhePage = lazy(() => import('../features/eventos/DetalhePage').then((m) => ({ default: m.DetalhePage })))
const ValidarCertificadoPage = lazy(() => import('../features/eventos/ValidarCertificadoPage').then((m) => ({ default: m.ValidarCertificadoPage })))
const EventoFormPage = lazy(() => import('../features/gestao/EventoFormPage').then((m) => ({ default: m.EventoFormPage })))
const GestaoEventoPage = lazy(() => import('../features/gestao/GestaoEventoPage').then((m) => ({ default: m.GestaoEventoPage })))
const MeusEventosPage = lazy(() => import('../features/gestao/MeusEventosPage').then((m) => ({ default: m.MeusEventosPage })))
const MinhasInscricoesPage = lazy(() => import('../features/inscricoes/MinhasInscricoesPage').then((m) => ({ default: m.MinhasInscricoesPage })))
const PagamentoPage = lazy(() => import('../features/inscricoes/PagamentoPage').then((m) => ({ default: m.PagamentoPage })))
const NotificacoesPage = lazy(() => import('../features/notificacoes/NotificacoesPage').then((m) => ({ default: m.NotificacoesPage })))
const PerfilPage = lazy(() => import('../features/perfil/PerfilPage').then((m) => ({ default: m.PerfilPage })))

function NaoEncontrada() {
  useTitulo('Página não encontrada')
  return (
    <main className="pagina pagina--estreita" id="conteudo">
      <div className="estado">
        <div className="estado__icone" aria-hidden="true">
          ?
        </div>
        <h1 className="cartao__titulo">Página não encontrada</h1>
        <p>O endereço que você abriu não existe.</p>
        <Link to="/" className="botao">
          Voltar ao início
        </Link>
      </div>
    </main>
  )
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<MuralPage />} />
        <Route path="eventos/:id" element={<DetalhePage />} />
        <Route path="entrar" element={<LoginPage />} />
        <Route path="cadastro" element={<CadastroPage />} />
        <Route path="certificados" element={<ValidarCertificadoPage />} />
        <Route path="certificados/:codigo" element={<ValidarCertificadoPage />} />

        <Route element={<RotaProtegida />}>
          <Route path="minhas-inscricoes" element={<MinhasInscricoesPage />} />
          <Route path="inscricoes/:id/pagamento" element={<PagamentoPage />} />
          <Route path="notificacoes" element={<NotificacoesPage />} />
          <Route path="perfil" element={<PerfilPage />} />
          <Route path="meus-eventos" element={<MeusEventosPage />} />
          <Route path="meus-eventos/novo" element={<EventoFormPage />} />
          <Route path="meus-eventos/:id/editar" element={<EventoFormPage />} />
          <Route path="meus-eventos/:id" element={<GestaoEventoPage />} />
        </Route>

        <Route path="*" element={<NaoEncontrada />} />
      </Route>
    </Routes>
  )
}
