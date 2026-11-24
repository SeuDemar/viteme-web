import { isAxiosError } from 'axios'

export interface ErroApi {
  status: number
  codigo: string | null
  mensagem: string
  /** Erros 400 por campo (chaves em camelCase), prontos para mostrar nos formulários. */
  campos: Record<string, string[]>
  traceId?: string
}

const MENSAGENS_POR_STATUS: Record<number, string> = {
  400: 'Confira os dados informados.',
  401: 'Sua sessão expirou. Entre novamente.',
  403: 'Você não tem acesso a esta área.',
  404: 'Não encontramos o que você procurava.',
  412: 'Este conteúdo foi alterado por outra pessoa. Recarregue para continuar.',
  423: 'Conta bloqueada temporariamente por tentativas de login. Tente novamente em alguns minutos.',
  429: 'Muitas tentativas. Aguarde um pouco e tente novamente.',
  500: 'Algo deu errado do nosso lado. Tente novamente.',
  502: 'Um serviço externo (pagamento, SMS ou consulta de CNPJ) está indisponível. Tente novamente em instantes.',
}

/** Converte qualquer falha (ProblemDetails da API, rede, timeout) em um formato único para a interface. */
export function mapearErro(erro: unknown): ErroApi {
  if (isAxiosError(erro)) {
    if (!erro.response) {
      return { status: 0, codigo: 'SEM_CONEXAO', mensagem: 'Não foi possível conectar. Verifique sua internet e tente novamente.', campos: {} }
    }

    const { status, data } = erro.response
    const corpo = (typeof data === 'object' && data !== null ? data : {}) as {
      detail?: string
      codigo?: string
      errors?: Record<string, string[]>
      traceId?: string
    }
    // 401 de login traz mensagem própria e genérica (não revela se o e-mail existe); os demais 401 viram "sessão expirou".
    // 403 CNPJ_NAO_VERIFICADO explica o que fazer (cadastrar o CNPJ no perfil), diferente do 403 genérico.
    const usarDetalhe = (status === 409 || status === 422 || status === 423 || status === 429 || status === 502 || corpo.codigo === 'CREDENCIAIS_INVALIDAS' || corpo.codigo === 'CNPJ_NAO_VERIFICADO') && corpo.detail
    return {
      status,
      codigo: corpo.codigo ?? null,
      mensagem: usarDetalhe ? corpo.detail! : (MENSAGENS_POR_STATUS[status] ?? corpo.detail ?? MENSAGENS_POR_STATUS[500]),
      campos: corpo.errors ?? {},
      traceId: corpo.traceId,
    }
  }

  return { status: 0, codigo: null, mensagem: 'Algo deu errado. Tente novamente.', campos: {} }
}

/** Primeira mensagem de um campo (aceita a chave em camelCase ou PascalCase). */
export function erroDoCampo(erro: ErroApi | null | undefined, campo: string): string | undefined {
  if (!erro) return undefined
  const chave = Object.keys(erro.campos).find((c) => c.toLowerCase() === campo.toLowerCase())
  return chave ? erro.campos[chave][0] : undefined
}
