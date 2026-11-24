/**
 * Distribuição dos cards do mural numa grade de 12 colunas, para as fileiras não ficarem todas "quadradinhos iguais":
 * as linhas alternam 3 cards iguais (4+4+4) com 2 cards de larguras diferentes (5+7 e 7+5). O card em destaque ocupa 8
 * colunas (com mais um ao lado), e um card com imagem pega a faixa mais larga da linha. A ordem por data nunca muda.
 */
const CICLO: readonly (readonly number[])[] = [
  [4, 4, 4],
  [5, 7],
  [4, 4, 4],
  [7, 5],
]

export function distribuirColunas(itens: { imagemUrl: string | null }[], comDestaque: boolean): number[] {
  const colunas: number[] = []
  let i = 0
  if (comDestaque && itens.length > 0) {
    colunas.push(8)
    i = 1
    if (itens.length > 1) {
      colunas.push(4)
      i = 2
    }
  }

  let fileira = 0
  while (i < itens.length) {
    const restantes = itens.length - i
    const temImagem = (k: number) => Boolean(itens[i + k]?.imagemUrl)

    let padrao: readonly number[]
    if (restantes === 1) padrao = [6]
    else if (temImagem(0)) padrao = [7, 5]
    else if (temImagem(1)) padrao = [5, 7]
    else padrao = CICLO[fileira % CICLO.length]!
    fileira += 1

    // Sobraram menos cards do que a fileira prevista: fecha com duas colunas iguais.
    if (padrao.length > restantes) padrao = [6, 6]
    colunas.push(...padrao)
    i += padrao.length
  }
  return colunas
}
