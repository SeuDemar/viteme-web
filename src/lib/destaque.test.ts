import { describe, expect, it } from 'vitest'
import type { EventoResumo } from '../api/tipos'
import { comDestaqueNaFrente, escolherDestaque } from './destaque'

const evento = (id: string, extra: Partial<EventoResumo> = {}): EventoResumo => ({
  id,
  titulo: `Evento ${id}`,
  categoria: 'Palestra',
  local: 'Auditório',
  dataInicio: '2026-12-01T19:00:00Z',
  preco: 0,
  vagasRestantes: null,
  imagemUrl: null,
  alteradoRecentemente: false,
  inscricoesAbertas: true,
  ...extra,
})

describe('destaque automático do mural', () => {
  it('não destaca com menos de 3 eventos', () => {
    expect(escolherDestaque([evento('1'), evento('2')])).toBe(-1)
  })

  it('sem imagens, destaca o primeiro (o que começa antes)', () => {
    expect(escolherDestaque([evento('1'), evento('2'), evento('3')])).toBe(0)
  })

  it('pula evento lotado ou com inscrições encerradas', () => {
    const lista = [evento('1', { vagasRestantes: 0 }), evento('2', { inscricoesAbertas: false }), evento('3')]
    expect(escolherDestaque(lista)).toBe(2)
  })

  it('prefere quem tem imagem de capa', () => {
    const lista = [evento('1'), evento('2', { imagemUrl: 'https://exemplo.com/a.jpg' }), evento('3')]
    expect(escolherDestaque(lista)).toBe(1)
  })

  it('imagem não vale para evento indisponível', () => {
    const lista = [evento('1'), evento('2', { imagemUrl: 'https://exemplo.com/a.jpg', vagasRestantes: 0 }), evento('3')]
    expect(escolherDestaque(lista)).toBe(0)
  })

  it('sem nenhum evento disponível, ninguém é destacado', () => {
    expect(escolherDestaque([evento('1', { vagasRestantes: 0 }), evento('2', { vagasRestantes: 0 }), evento('3', { vagasRestantes: 0 })])).toBe(-1)
  })

  it('coloca o destacado na frente e mantém a ordem dos outros', () => {
    const lista = [evento('1'), evento('2'), evento('3'), evento('4')]
    expect(comDestaqueNaFrente(lista, 2).map((e) => e.id)).toEqual(['3', '1', '2', '4'])
    expect(comDestaqueNaFrente(lista, 0)).toBe(lista)
  })
})
