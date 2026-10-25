import { useEffect } from 'react'
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import type { ErroApi } from './erros'

/**
 * Mostra nos próprios campos os erros 400 devolvidos pela API (chaves em camelCase). Devolve true se algum
 * campo foi preenchido; caso contrário o chamador mostra `erro.mensagem` em um alerta (CT61).
 */
export function aplicarErrosDosCampos<T extends FieldValues>(erro: ErroApi, setError: UseFormSetError<T>, campos: readonly string[]): boolean {
  let aplicou = false
  for (const [chave, mensagens] of Object.entries(erro.campos)) {
    const campo = campos.find((c) => c.toLowerCase() === chave.toLowerCase())
    if (campo && mensagens[0]) {
      setError(campo as Path<T>, { type: 'server', message: mensagens[0] })
      aplicou = true
    }
  }
  return aplicou
}

export function useTitulo(titulo: string) {
  useEffect(() => {
    document.title = `${titulo} • Viteme`
  }, [titulo])
}
