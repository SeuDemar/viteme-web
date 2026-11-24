import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Estado {
  erro: Error | null
}

/**
 * Evita a página em branco quando uma tela falha ao renderizar ou ao ser carregada (chunk ausente após deploy).
 * O Layout passa o caminho como `key`, então navegar para outra tela limpa o erro.
 */
export class LimiteDeErro extends Component<{ children: ReactNode }, Estado> {
  state: Estado = { erro: null }

  static getDerivedStateFromError(erro: Error): Estado {
    return { erro }
  }

  componentDidCatch(erro: Error, info: ErrorInfo) {
    console.error('Falha ao exibir a tela', erro, info.componentStack)
  }

  render() {
    if (!this.state.erro) return this.props.children
    return (
      <main className="pagina pagina--estreita" id="conteudo">
        <div className="estado estado--erro" role="alert">
          <div className="estado__icone" aria-hidden="true">
            !
          </div>
          <strong>Não foi possível abrir esta tela</strong>
          <p>Recarregue a página. Se o problema continuar, tente novamente em alguns minutos.</p>
          <button type="button" className="botao botao--secundario" onClick={() => window.location.reload()}>
            Recarregar a página
          </button>
        </div>
      </main>
    )
  }
}
