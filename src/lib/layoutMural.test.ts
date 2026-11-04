import { describe, expect, it } from 'vitest'
import { distribuirColunas } from './layoutMural'

const sem = { imagemUrl: null }
const com = { imagemUrl: 'https://exemplo.com/a.jpg' }
const lista = (...i: { imagemUrl: string | null }[]) => i

describe('distribuição dos cards do mural', () => {
  it('sem imagens e sem destaque, alterna 3 iguais com 2 de larguras diferentes', () => {
    expect(distribuirColunas(lista(sem, sem, sem, sem, sem, sem, sem, sem, sem, sem), false)).toEqual([4, 4, 4, 5, 7, 4, 4, 4, 7, 5])
  })

  it('o destaque ocupa 8 colunas e um vizinho 4; o resto segue o ciclo', () => {
    expect(distribuirColunas(lista(sem, sem, sem, sem, sem, sem), true)).toEqual([8, 4, 4, 4, 4, 6])
  })

  it('card com imagem pega a faixa mais larga da fileira', () => {
    expect(distribuirColunas(lista(com, sem, sem, sem), false)).toEqual([7, 5, 5, 7])
    expect(distribuirColunas(lista(sem, com, sem, sem), false)).toEqual([5, 7, 5, 7])
  })

  it('as fileiras fecham em 12 colunas, exceto um card sozinho no fim (6)', () => {
    for (let n = 1; n <= 24; n += 1) {
      const itens = Array.from({ length: n }, (_, k) => (k % 5 === 2 ? com : sem))
      const colunas = distribuirColunas(itens, n >= 3)
      expect(colunas).toHaveLength(n)
      let soma = 0
      for (const c of colunas) {
        soma += c
        if (soma === 12) soma = 0
        expect(soma).toBeLessThanOrEqual(12)
      }
      if (soma !== 0) expect(soma).toBe(6)
    }
  })

  it('lista vazia não quebra', () => {
    expect(distribuirColunas([], true)).toEqual([])
  })
})
