import { describe, expect, it } from 'vitest'
import { adicionarMeses, chaveDeDataBr, chaveDia, dataBrDaChave, dataDaChave, dividirValor, horaValida, mascaraData, mascaraHora, semanasDoMes } from './calendario'

describe('calendário', () => {
  it('máscara de data coloca as barras sozinha e ignora o que não é número', () => {
    expect(mascaraData('1')).toBe('1')
    expect(mascaraData('121')).toBe('12/1')
    expect(mascaraData('12112026')).toBe('12/11/2026')
    expect(mascaraData('12/11/2026 99')).toBe('12/11/2026')
    expect(mascaraData('ab')).toBe('')
  })

  it('máscara e validação de hora', () => {
    expect(mascaraHora('1930')).toBe('19:30')
    expect(horaValida('19:30')).toBe(true)
    expect(horaValida('24:00')).toBe(false)
    expect(horaValida('19:60')).toBe(false)
    expect(horaValida('9:30')).toBe(false)
  })

  it('converte entre dd/mm/aaaa e a chave do dia, recusando datas impossíveis', () => {
    expect(chaveDeDataBr('12/11/2099')).toBe('2099-11-12')
    expect(chaveDeDataBr('31/02/2099')).toBeNull()
    expect(chaveDeDataBr('12/11/20')).toBeNull()
    expect(chaveDeDataBr('12/11/1800')).toBeNull()
    expect(dataBrDaChave('2099-11-12')).toBe('12/11/2099')
    expect(dataDaChave('2099-02-30')).toBeNull()
  })

  it('divide o valor do formulário em dia e hora', () => {
    expect(dividirValor('2099-11-12T19:00')).toEqual({ dia: '2099-11-12', hora: '19:00' })
    expect(dividirValor('')).toEqual({ dia: '', hora: '' })
    expect(dividirValor('lixo')).toEqual({ dia: '', hora: '' })
  })

  it('soma meses sem estourar o fim do mês', () => {
    expect(chaveDia(adicionarMeses(new Date(2026, 0, 31), 1))).toBe('2026-02-28')
    expect(chaveDia(adicionarMeses(new Date(2026, 11, 15), 1))).toBe('2027-01-15')
    expect(chaveDia(adicionarMeses(new Date(2026, 0, 15), -1))).toBe('2025-12-15')
  })

  it('monta seis semanas começando no domingo', () => {
    const semanas = semanasDoMes(2026, 10) // novembro de 2026 começa num domingo
    expect(semanas).toHaveLength(6)
    expect(semanas.every((s) => s.length === 7)).toBe(true)
    expect(chaveDia(semanas[0]![0]!)).toBe('2026-11-01')
    expect(semanas[0]![0]!.getDay()).toBe(0)
    expect(chaveDia(semanasDoMes(2026, 11)[0]![0]!)).toBe('2026-11-29')
  })
})
