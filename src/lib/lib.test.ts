import { AxiosError } from 'axios'
import { describe, expect, it } from 'vitest'
import { mapearErro } from './erros'
import { alteradoRecentemente, dataCurta, hora, mascararTelefone, minutosRestantes, moeda, telefoneDeE164, telefoneParaE164 } from './formatar'

describe('formatadores', () => {
  it('telefone: máscara e conversão de/para E.164', () => {
    expect(mascararTelefone('44999990000')).toBe('(44) 99999-0000')
    expect(mascararTelefone('4433334444')).toBe('(44) 3333-4444')
    expect(telefoneParaE164('(44) 99999-0000')).toBe('+5544999990000')
    expect(telefoneParaE164('')).toBeUndefined()
    expect(telefoneDeE164('+5544999990000')).toBe('(44) 99999-0000')
  })

  it('selo "Alterado" vale por 72 horas (RN13)', () => {
    const agora = new Date('2026-11-10T12:00:00Z')
    expect(alteradoRecentemente('2026-11-07T12:00:01Z', agora)).toBe(true)
    expect(alteradoRecentemente('2026-11-07T11:59:59Z', agora)).toBe(false)
  })

  it('datas, horas e moeda em português do Brasil', () => {
    const d = new Date(2026, 10, 12, 19, 0)
    expect(dataCurta(d)).toBe('12 nov')
    expect(hora(d)).toBe('19h')
    expect(hora(new Date(2026, 10, 12, 19, 30))).toBe('19h30')
    expect(moeda(25)).toMatch(/R\$\s?25,00/)
  })

  it('minutos restantes da reserva', () => {
    const agora = new Date('2026-11-10T12:00:00Z')
    expect(minutosRestantes('2026-11-10T12:30:00Z', agora)).toBe(30)
    expect(minutosRestantes('2026-11-10T11:59:00Z', agora)).toBeNull()
  })
})

describe('mapearErro', () => {
  const erroHttp = (status: number, data: unknown) =>
    new AxiosError('falhou', 'ERR', undefined, undefined, { status, data, statusText: '', headers: {}, config: { headers: {} } as never })

  it('usa o detail em 409/422 e preserva o código de negócio', () => {
    const erro = mapearErro(erroHttp(422, { codigo: 'SEM_VAGAS', detail: 'Todas as vagas foram preenchidas.' }))
    expect(erro).toMatchObject({ status: 422, codigo: 'SEM_VAGAS', mensagem: 'Todas as vagas foram preenchidas.' })
  })

  it('devolve os erros por campo do 400', () => {
    const erro = mapearErro(erroHttp(400, { codigo: 'DADOS_INVALIDOS', errors: { senha: ['Muito curta.'] } }))
    expect(erro.campos).toEqual({ senha: ['Muito curta.'] })
  })

  it('erro de rede vira SEM_CONEXAO', () => {
    const erro = mapearErro(new AxiosError('Network Error'))
    expect(erro.codigo).toBe('SEM_CONEXAO')
    expect(erro.status).toBe(0)
  })

  it('500 não expõe detalhes internos', () => {
    expect(mapearErro(erroHttp(500, { detail: 'NullReferenceException em X.cs' })).mensagem).not.toContain('NullReference')
  })
})
