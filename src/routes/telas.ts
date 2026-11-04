/**
 * Carregadores das telas que vão em pacotes separados. Ficam num arquivo só com `import()` dinâmico (sem importar as
 * telas de forma estática) para qualquer parte do app poder "aquecer" um pacote sem criar dependência circular.
 */
export const carregarCadastro = () => import('../features/auth/CadastroPage').then((m) => ({ default: m.CadastroPage }))
export const carregarLogin = () => import('../features/auth/LoginPage').then((m) => ({ default: m.LoginPage }))
export const carregarDetalhe = () => import('../features/eventos/DetalhePage').then((m) => ({ default: m.DetalhePage }))
export const carregarValidarCertificado = () => import('../features/eventos/ValidarCertificadoPage').then((m) => ({ default: m.ValidarCertificadoPage }))
export const carregarEventoForm = () => import('../features/gestao/EventoFormPage').then((m) => ({ default: m.EventoFormPage }))
export const carregarGestaoEvento = () => import('../features/gestao/GestaoEventoPage').then((m) => ({ default: m.GestaoEventoPage }))
export const carregarMeusEventos = () => import('../features/gestao/MeusEventosPage').then((m) => ({ default: m.MeusEventosPage }))
export const carregarMinhasInscricoes = () => import('../features/inscricoes/MinhasInscricoesPage').then((m) => ({ default: m.MinhasInscricoesPage }))
export const carregarPagamento = () => import('../features/inscricoes/PagamentoPage').then((m) => ({ default: m.PagamentoPage }))
export const carregarNotificacoes = () => import('../features/notificacoes/NotificacoesPage').then((m) => ({ default: m.NotificacoesPage }))
export const carregarPerfil = () => import('../features/perfil/PerfilPage').then((m) => ({ default: m.PerfilPage }))

/** Baixa, em segundo plano, os pacotes das telas mais prováveis (o navegador guarda; a navegação deixa de mostrar "Carregando"). */
export function aquecerTelas(logado: boolean) {
  const carregadores = logado
    ? [carregarDetalhe, carregarMinhasInscricoes, carregarMeusEventos, carregarNotificacoes, carregarPerfil]
    : [carregarDetalhe, carregarLogin, carregarCadastro]
  for (const carregar of carregadores) void carregar().catch(() => undefined)
}
