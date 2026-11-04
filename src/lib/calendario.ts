/** Funções puras do seletor de data e hora. O valor trafega como "AAAA-MM-DDTHH:mm" (o mesmo formato do formulário). */

export const NOMES_DIAS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'] as const
export const SIGLAS_DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'] as const
export const HORA_PADRAO = '08:00'
export const HORARIOS_RAPIDOS = ['08:00', '12:00', '14:00', '19:00'] as const

const pad = (n: number) => String(n).padStart(2, '0')

/** "2026-11-12" (dia no fuso local). */
export const chaveDia = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/** Converte "AAAA-MM-DD" em Date local; devolve null se o texto ou a data (ex.: 31/02) forem inválidos. */
export function dataDaChave(chave: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(chave)
  if (!m) return null
  const [ano, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const d = new Date(ano, mes - 1, dia)
  return d.getFullYear() === ano && d.getMonth() === mes - 1 && d.getDate() === dia ? d : null
}

/** "12/11/2026" a partir de "2026-11-12". */
export function dataBrDaChave(chave: string): string {
  const d = dataDaChave(chave)
  return d ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}` : ''
}

/** "2026-11-12" a partir de "12/11/2026"; null se incompleta, impossível ou de antes de 1900. */
export function chaveDeDataBr(texto: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto)
  if (!m || Number(m[3]) < 1900) return null
  const chave = `${m[3]}-${m[2]}-${m[1]}`
  return dataDaChave(chave) ? chave : null
}

/** Máscara de digitação: só números, com as barras entrando sozinhas ("12112026" → "12/11/2026"). */
export function mascaraData(texto: string): string {
  const n = texto.replace(/\D/g, '').slice(0, 8)
  if (n.length <= 2) return n
  if (n.length <= 4) return `${n.slice(0, 2)}/${n.slice(2)}`
  return `${n.slice(0, 2)}/${n.slice(2, 4)}/${n.slice(4)}`
}

/** Máscara de hora ("1930" → "19:30"). */
export function mascaraHora(texto: string): string {
  const n = texto.replace(/\D/g, '').slice(0, 4)
  return n.length <= 2 ? n : `${n.slice(0, 2)}:${n.slice(2)}`
}

export const horaValida = (texto: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(texto)

/** Separa "AAAA-MM-DDTHH:mm" em dia e hora (vazios quando o valor é inválido). */
export function dividirValor(valor: string): { dia: string; hora: string } {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(valor)
  return m && dataDaChave(m[1]!) ? { dia: m[1]!, hora: m[2]! } : { dia: '', hora: '' }
}

export const juntarValor = (dia: string, hora: string) => `${dia}T${hora}`

export function adicionarDias(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
}

/** Soma meses mantendo o dia, ou o último dia do mês quando ele não existe (31 jan + 1 mês = 28 fev). */
export function adicionarMeses(d: Date, n: number): Date {
  const alvo = new Date(d.getFullYear(), d.getMonth() + n, 1)
  const ultimo = new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0).getDate()
  return new Date(alvo.getFullYear(), alvo.getMonth(), Math.min(d.getDate(), ultimo))
}

/** Seis semanas (domingo a sábado) que cobrem o mês, com os dias vizinhos nas pontas. */
export function semanasDoMes(ano: number, mes: number): Date[][] {
  const primeiro = new Date(ano, mes, 1)
  const inicio = adicionarDias(primeiro, -primeiro.getDay())
  return Array.from({ length: 6 }, (_, s) => Array.from({ length: 7 }, (_, d) => adicionarDias(inicio, s * 7 + d)))
}

/** "novembro de 2026" */
export const tituloDoMes = (ano: number, mes: number) => new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(ano, mes, 1))

/** "12 de novembro de 2026" (nome acessível de cada dia). */
export const rotuloDoDia = (d: Date) => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(d)
