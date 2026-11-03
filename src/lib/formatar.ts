const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

function paraData(valor: string | Date): Date {
  return valor instanceof Date ? valor : new Date(valor)
}

/** "12 nov" */
export function dataCurta(valor: string | Date): string {
  const d = paraData(valor)
  return `${d.getDate()} ${MESES_CURTOS[d.getMonth()]}`
}

/** "12 de novembro de 2026" */
export function dataLonga(valor: string | Date): string {
  return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }).format(paraData(valor))
}

/** "12/11/2026" */
export function dataNumerica(valor: string | Date): string {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(paraData(valor))
}

/** "19h" ou "19h30" */
export function hora(valor: string | Date): string {
  const d = paraData(valor)
  const m = d.getMinutes()
  return m === 0 ? `${d.getHours()}h` : `${d.getHours()}h${String(m).padStart(2, '0')}`
}

/** "12/11/2026, 19:00" */
export function dataEHora(valor: string | Date): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(paraData(valor))
}

export function moeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)
}

export function precoOuGratuito(valor: number): string {
  return valor > 0 ? moeda(valor) : 'Gratuito'
}

/** Converte ISO UTC para o valor de um `<input type="datetime-local">` no fuso do navegador. */
export function paraCampoDataHora(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Converte o valor de `datetime-local` (fuso do navegador) para ISO 8601 UTC. */
export function doCampoDataHora(valor: string): string {
  return new Date(valor).toISOString()
}

/** Máscara de telefone brasileiro: (44) 99999-9999. */
export function mascararTelefone(valor: string): string {
  const d = valor.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

/** Máscara do CNPJ enquanto digita: "12.ABC.345/01DE-35". Aceita letras (CNPJ alfanumérico da Receita). */
export function mascararCnpj(valor: string): string {
  const c = valor.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 14)
  if (c.length <= 2) return c
  if (c.length <= 5) return `${c.slice(0, 2)}.${c.slice(2)}`
  if (c.length <= 8) return `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5)}`
  if (c.length <= 12) return `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8)}`
  return `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8, 12)}-${c.slice(12)}`
}

/** "(44) 99999-9999" → "+5544999999999". Vazio → undefined. */
export function telefoneParaE164(valor: string | null | undefined): string | undefined {
  const digitos = (valor ?? '').replace(/\D/g, '')
  if (!digitos) return undefined
  return digitos.startsWith('55') && digitos.length > 11 ? `+${digitos}` : `+55${digitos}`
}

/** "+5544999999999" → "(44) 99999-9999". */
export function telefoneDeE164(valor: string | null | undefined): string {
  if (!valor) return ''
  const digitos = valor.replace(/\D/g, '')
  return mascararTelefone(digitos.startsWith('55') && digitos.length > 11 ? digitos.slice(2) : digitos)
}

const HORAS_SELO_ALTERADO = 72

/** Selo "Alterado": alteração nas últimas 72 horas (RN13). */
export function alteradoRecentemente(criadoEm: string, agora: Date = new Date()): boolean {
  return agora.getTime() - new Date(criadoEm).getTime() <= HORAS_SELO_ALTERADO * 3600_000
}

/** "faltam 12 min" até uma data futura; null se já passou. */
export function minutosRestantes(ate: string, agora: Date = new Date()): number | null {
  const ms = new Date(ate).getTime() - agora.getTime()
  return ms > 0 ? Math.ceil(ms / 60_000) : null
}

/** Trecho seguro para nome de arquivo: sem acentos, minúsculo, só letras, números e hífens. */
export function paraNomeDeArquivo(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
