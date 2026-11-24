import type { EventoResumo } from '../api/tipos'

const MINIMO_PARA_DESTACAR = 3

const disponivel = (e: EventoResumo) => e.inscricoesAbertas !== false && e.vagasRestantes !== 0

/**
 * Escolhe, entre os eventos da primeira página, o que ganha o destaque do mural. Sem curadoria manual:
 * só concorre quem está com inscrições abertas e vagas; quem tem imagem de capa vem antes; o empate
 * fica com o que começa primeiro (a API já entrega por data de início). Devolve o índice, ou -1.
 */
export function escolherDestaque(eventos: EventoResumo[]): number {
  if (eventos.length < MINIMO_PARA_DESTACAR) return -1
  const candidatos = eventos.map((e, i) => ({ e, i })).filter(({ e }) => disponivel(e))
  const escolhido = candidatos.find(({ e }) => e.imagemUrl) ?? candidatos[0]
  return escolhido ? escolhido.i : -1
}

/** Coloca o evento em destaque na frente e mantém os demais na ordem original. */
export function comDestaqueNaFrente(eventos: EventoResumo[], indice: number): EventoResumo[] {
  if (indice <= 0) return eventos
  return [eventos[indice]!, ...eventos.filter((_, i) => i !== indice)]
}
