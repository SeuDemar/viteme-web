/** Categorias oferecidas na criação e no filtro do mural. A API aceita qualquer texto até 60 caracteres (pendência PW11). */
export const CATEGORIAS = ['Palestra', 'Workshop', 'Curso', 'Feira', 'Seminário', 'Outro'] as const

export const FILTROS_MURAL = [
  { rotulo: 'Todos', categoria: undefined },
  { rotulo: 'Palestras', categoria: 'Palestra' },
  { rotulo: 'Workshops', categoria: 'Workshop' },
  { rotulo: 'Cursos', categoria: 'Curso' },
  { rotulo: 'Feiras', categoria: 'Feira' },
] as const
