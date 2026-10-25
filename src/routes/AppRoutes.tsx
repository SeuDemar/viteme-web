import { Link, Route, Routes } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { useTitulo } from '../lib/formulario'
import { CadastroPage } from '../features/auth/CadastroPage'
import { LoginPage } from '../features/auth/LoginPage'
import { DetalhePage } from '../features/eventos/DetalhePage'
import { MuralPage } from '../features/eventos/MuralPage'
import { ValidarCertificadoPage } from '../features/eventos/ValidarCertificadoPage'
import { EventoFormPage } from '../features/gestao/EventoFormPage'
import { GestaoEventoPage } from '../features/gestao/GestaoEventoPage'
import { MeusEventosPage } from '../features/gestao/MeusEventosPage'
import { MinhasInscricoesPage } from '../features/inscricoes/MinhasInscricoesPage'
import { PagamentoPage } from '../features/inscricoes/PagamentoPage'
import { NotificacoesPage } from '../features/notificacoes/NotificacoesPage'
import { PerfilPage } from '../features/perfil/PerfilPage'
import { RotaProtegida } from './RotaProtegida'

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
