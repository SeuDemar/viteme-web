import { describe, expect, it } from 'vitest'
import { descreverMudanca, rotuloCampo } from './alteracoes'
import { dataEHora } from './formatar'

describe('histórico de alterações (RN13)', () => {
  it('mostra o nome do campo em português', () => {
    expect(rotuloCampo('programacao')).toBe('Programação')
    expect(rotuloCampo('dataInicio')).toBe('Início')
    expect(rotuloCampo('outro')).toBe('outro')
  })

  it('formata as datas ISO, também dentro da descrição de uma atividade', () => {
    const texto = descreverMudanca({
      campo: 'programacao',
      valorAnterior: 'Abertura (2026-11-26T13:00:00Z a 2026-11-26T14:00:00Z)',
      valorNovo: 'Oficina (2026-11-26T13:00:00Z a 2026-11-26T14:00:00Z)',
    })
    const inicio = dataEHora('2026-11-26T13:00:00Z')
    expect(texto).toBe(`de “Abertura (${inicio} a ${dataEHora('2026-11-26T14:00:00Z')})” para “Oficina (${inicio} a ${dataEHora('2026-11-26T14:00:00Z')})”`)
    expect(texto).not.toContain('T13:00:00Z')
  })

  it('descreve atividade incluída e removida, que só têm um dos valores', () => {
    expect(descreverMudanca({ campo: 'programacao', valorAnterior: null, valorNovo: 'Abertura' })).toBe('incluído: “Abertura”')
    expect(descreverMudanca({ campo: 'programacao', valorAnterior: 'Abertura', valorNovo: null })).toBe('removido: “Abertura”')
    expect(descreverMudanca({ campo: 'local', valorAnterior: null, valorNovo: null })).toBe('')
  })

  it('mostra o preço em reais', () => {
    expect(descreverMudanca({ campo: 'preco', valorAnterior: '25.00', valorNovo: '30' })).toMatch(/^de “R\$\s25,00” para “R\$\s30,00”$/)
  })
})
