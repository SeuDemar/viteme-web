import type { NomeIcone } from '../components/Icone'

/** Categorias oferecidas na criação e no filtro do mural. A API aceita qualquer texto até 60 caracteres (pendência PW11). */
export const CATEGORIAS = ['Palestra', 'Workshop', 'Curso', 'Feira', 'Seminário', 'Outro'] as const

export const FILTROS_MURAL = [
  { rotulo: 'Todos', categoria: undefined },
  { rotulo: 'Palestras', categoria: 'Palestra' },
  { rotulo: 'Workshops', categoria: 'Workshop' },
  { rotulo: 'Cursos', categoria: 'Curso' },
  { rotulo: 'Feiras', categoria: 'Feira' },
] as const

/** Quantidade de tons de categoria definidos no CSS (--capa-N e --tom-N). */
export const TONS_CATEGORIA = 6

// Cada categoria conhecida tem sua cor fixa (índigo, verde-água, âmbar, coral, violeta, cinza-azulado).
const TOM_POR_CATEGORIA: Record<string, number> = {
  palestra: 0,
  curso: 1,
  feira: 2,
  workshop: 3,
  seminário: 4,
  outro: 5,
}

/** Tom da categoria: fixo para as conhecidas; as livres (a API aceita qualquer texto) caem num tom estável pelo nome. */
export function tomDaCategoria(categoria: string): number {
  const nome = categoria.trim().toLowerCase()
  const fixo = TOM_POR_CATEGORIA[nome]
  if (fixo !== undefined) return fixo
  return [...nome].reduce((soma, c) => soma + c.charCodeAt(0), 0) % TONS_CATEGORIA
}

// Ícone da categoria, usado na capa dos cards e nos chips de filtro (as livres caem em "eventos").
const ICONE_POR_CATEGORIA: Record<string, NomeIcone> = {
  palestra: 'usuarios',
  curso: 'certificado',
  feira: 'estrela',
  workshop: 'editar',
  seminário: 'bandeira',
}

export const iconeDaCategoria = (categoria: string): NomeIcone => ICONE_POR_CATEGORIA[categoria.trim().toLowerCase()] ?? 'eventos'
