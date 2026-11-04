import { fireEvent, screen, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'

/** Abre a caixa de seleção própria (Seletor) e escolhe a opção pelo texto que aparece na lista. */
export async function escolherOpcao(usuario: UserEvent, seletor: HTMLElement, texto: string) {
  await usuario.click(seletor)
  await usuario.click(await screen.findByRole('option', { name: texto }))
}

/** Preenche um SeletorDataHora pelos campos de data e hora do calendário. `valor`: "AAAA-MM-DDTHH:mm". */
export function definirDataHora(seletor: HTMLElement, valor: string) {
  const [dia, hora] = valor.split('T') as [string, string]
  const [ano, mes, d] = dia.split('-') as [string, string, string]
  fireEvent.click(seletor)
  const calendario = screen.getByRole('dialog', { name: 'Escolher data e hora' })
  fireEvent.change(within(calendario).getByLabelText('Data'), { target: { value: `${d}/${mes}/${ano}` } })
  fireEvent.change(within(calendario).getByLabelText('Hora'), { target: { value: hora } })
  fireEvent.keyDown(calendario, { key: 'Escape' })
}
