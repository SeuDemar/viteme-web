import { lazy } from 'react'
import { Link, Route, Routes } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { ProvedorDeToasts } from '../components/Toasts'
import { useTitulo } from '../lib/formulario'
import { MuralPage } from '../features/eventos/MuralPage'
import { RotaProtegida } from './RotaProtegida'
import {
  carregarCadastro,
  carregarDetalhe,
  carregarEventoForm,
  carregarGestaoEvento,
  carregarLogin,
  carregarMeusEventos,
  carregarMinhasInscricoes,
  carregarNotificacoes,
  carregarPagamento,
  carregarPerfil,
  carregarValidarCertificado,
} from './telas'

// O mural (página inicial) vai no pacote principal; as demais telas são carregadas sob demanda (veja telas.ts).
const CadastroPage = lazy(carregarCadastro)
const LoginPage = lazy(carregarLogin)
const DetalhePage = lazy(carregarDetalhe)
const ValidarCertificadoPage = lazy(carregarValidarCertificado)
const EventoFormPage = lazy(carregarEventoForm)
const GestaoEventoPage = lazy(carregarGestaoEvento)
const MeusEventosPage = lazy(carregarMeusEventos)
const MinhasInscricoesPage = lazy(carregarMinhasInscricoes)
const PagamentoPage = lazy(carregarPagamento)
const NotificacoesPage = lazy(carregarNotificacoes)
const PerfilPage = lazy(carregarPerfil)

function NaoEncontrada() {
  useTitulo('Página não encontrada', { indexar: false })
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
    <ProvedorDeToasts>
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
    </ProvedorDeToasts>
  )
}
