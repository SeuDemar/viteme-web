import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { CampoBusca } from '../components/CampoBusca'
import { CampoSenha } from '../components/CampoSenha'
import { Seletor } from '../components/Seletor'
import { SeletorDataHora } from '../components/SeletorDataHora'

const OPCOES = [
  { valor: 'a', rotulo: 'Alfa' },
  { valor: 'b', rotulo: 'Beta' },
  { valor: 'g', rotulo: 'Gama' },
]

function SeletorControlado({ inicial = '', aoMudar }: { inicial?: string; aoMudar?: (v: string) => void }) {
  const [valor, setValor] = useState(inicial)
  return (
    <>
      <label htmlFor="s">Letra</label>
      <Seletor
        id="s"
        value={valor}
        onChange={(v) => {
          setValor(v)
          aoMudar?.(v)
        }}
        opcoes={OPCOES}
        placeholder="Escolha"
      />
    </>
  )
}

function DataControlada({ inicial = '', min, aoMudar }: { inicial?: string; min?: string; aoMudar?: (v: string) => void }) {
  const [valor, setValor] = useState(inicial)
  return (
    <>
      <label htmlFor="d">Quando</label>
      <SeletorDataHora
        id="d"
        value={valor}
        min={min}
        onChange={(v) => {
          setValor(v)
          aoMudar?.(v)
        }}
      />
    </>
  )
}

describe('Seletor', () => {
  it('mostra o texto de apoio, abre pelo clique e escolhe a opção', async () => {
    const aoMudar = vi.fn()
    const usuario = userEvent.setup()
    render(<SeletorControlado aoMudar={aoMudar} />)

    const campo = screen.getByLabelText('Letra')
    expect(campo).toHaveTextContent('Escolha')
    expect(campo).toHaveAttribute('aria-expanded', 'false')
    await usuario.click(campo)
    expect(campo).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Alfa', 'Beta', 'Gama'])

    await usuario.click(screen.getByRole('option', { name: 'Beta' }))
    expect(aoMudar).toHaveBeenCalledWith('b')
    expect(campo).toHaveTextContent('Beta')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('funciona só com o teclado: setas, Enter, Escape, Home/End e digitação', async () => {
    const usuario = userEvent.setup()
    render(<SeletorControlado inicial="b" />)
    const campo = screen.getByLabelText('Letra')

    campo.focus()
    await usuario.keyboard('{ArrowDown}')
    expect(screen.getByRole('option', { name: 'Beta' })).toHaveAttribute('aria-selected', 'true')
    expect(campo).toHaveAttribute('aria-activedescendant', screen.getByRole('option', { name: 'Beta' }).id)

    await usuario.keyboard('{ArrowDown}{Enter}')
    expect(campo).toHaveTextContent('Gama')

    await usuario.keyboard('{Enter}{Home}{Enter}')
    expect(campo).toHaveTextContent('Alfa')

    await usuario.keyboard('{ArrowDown}{Escape}')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(campo).toHaveTextContent('Alfa')

    await usuario.keyboard('g')
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    await usuario.keyboard('{Enter}')
    expect(campo).toHaveTextContent('Gama')
  })

  it('fecha ao clicar fora e não renderiza nenhum <select> nativo', async () => {
    const usuario = userEvent.setup()
    const { container } = render(<SeletorControlado />)
    await usuario.click(screen.getByLabelText('Letra'))
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    await usuario.click(document.body)
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(container.querySelector('select')).toBeNull()
  })
})

describe('SeletorDataHora', () => {
  it('não usa input nativo de data e mostra o valor formatado', () => {
    const { container } = render(<DataControlada inicial="2099-11-12T19:30" />)
    expect(screen.getByLabelText('Quando')).toHaveTextContent('12/11/2099 às 19:30')
    expect(container.querySelector('input[type="datetime-local"], input[type="date"], input[type="time"]')).toBeNull()
  })

  it('escolhe o dia no calendário e aplica a hora padrão', async () => {
    const aoMudar = vi.fn()
    const usuario = userEvent.setup()
    render(<DataControlada inicial="2099-11-12T19:30" aoMudar={aoMudar} />)

    await usuario.click(screen.getByLabelText('Quando'))
    const calendario = screen.getByRole('dialog', { name: 'Escolher data e hora' })
    expect(within(calendario).getByText('novembro de 2099')).toBeInTheDocument()
    expect(within(calendario).getByRole('button', { name: '12 de novembro de 2099', pressed: true })).toBeInTheDocument()

    await usuario.click(within(calendario).getByRole('button', { name: '20 de novembro de 2099' }))
    expect(aoMudar).toHaveBeenLastCalledWith('2099-11-20T19:30')
    expect(screen.getByLabelText('Quando')).toHaveTextContent('20/11/2099 às 19:30')
  })

  it('navega entre os meses pelos botões, respeitando o ano e a ordem', async () => {
    const aoMudar = vi.fn()
    const usuario = userEvent.setup()
    render(<DataControlada inicial="2099-11-12T19:30" aoMudar={aoMudar} />)
    await usuario.click(screen.getByLabelText('Quando'))
    await usuario.click(screen.getByRole('button', { name: 'Próximo mês' }))
    expect(screen.getByText('dezembro de 2099')).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Mês anterior' }))
    await usuario.click(screen.getByRole('button', { name: 'Mês anterior' }))
    expect(screen.getByText('outubro de 2099')).toBeInTheDocument()
  })

  it('digita data e hora com máscara e usa os horários rápidos', async () => {
    const aoMudar = vi.fn()
    const usuario = userEvent.setup()
    render(<DataControlada aoMudar={aoMudar} />)

    await usuario.click(screen.getByLabelText('Quando'))
    const calendario = screen.getByRole('dialog', { name: 'Escolher data e hora' })
    await usuario.type(within(calendario).getByLabelText('Data'), '12112099')
    expect(within(calendario).getByLabelText('Data')).toHaveValue('12/11/2099')
    expect(aoMudar).toHaveBeenLastCalledWith('2099-11-12T08:00')

    await usuario.clear(within(calendario).getByLabelText('Hora'))
    await usuario.type(within(calendario).getByLabelText('Hora'), '1930')
    expect(within(calendario).getByLabelText('Hora')).toHaveValue('19:30')
    expect(aoMudar).toHaveBeenLastCalledWith('2099-11-12T19:30')

    await usuario.click(within(calendario).getByRole('button', { name: '14:00' }))
    expect(aoMudar).toHaveBeenLastCalledWith('2099-11-12T14:00')
  })

  it('ignora data impossível (31/02) e não chama onChange', async () => {
    const aoMudar = vi.fn()
    const usuario = userEvent.setup()
    render(<DataControlada aoMudar={aoMudar} />)
    await usuario.click(screen.getByLabelText('Quando'))
    await usuario.type(screen.getByLabelText('Data'), '31022099')
    expect(aoMudar).not.toHaveBeenCalled()
  })

  it('desabilita os dias antes do mínimo e trava o mês anterior', async () => {
    const usuario = userEvent.setup()
    render(<DataControlada inicial="2099-11-12T19:30" min="2099-11-10T00:00" />)
    await usuario.click(screen.getByLabelText('Quando'))
    expect(screen.getByRole('button', { name: '9 de novembro de 2099' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '10 de novembro de 2099' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Mês anterior' })).toBeDisabled()
  })

  it('navega o calendário com o teclado, escolhe com Enter e fecha com Escape devolvendo o foco', async () => {
    const aoMudar = vi.fn()
    const usuario = userEvent.setup()
    render(<DataControlada inicial="2099-11-12T19:30" aoMudar={aoMudar} />)
    const campo = screen.getByLabelText('Quando')

    await usuario.click(campo)
    expect(screen.getByRole('button', { name: '12 de novembro de 2099' })).toHaveFocus()
    await usuario.keyboard('{ArrowRight}{ArrowDown}')
    expect(screen.getByRole('button', { name: '20 de novembro de 2099' })).toHaveFocus()
    await usuario.keyboard('{PageDown}')
    expect(screen.getByText('dezembro de 2099')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '20 de dezembro de 2099' })).toHaveFocus()
    await usuario.keyboard('{Enter}')
    expect(aoMudar).toHaveBeenLastCalledWith('2099-12-20T19:30')

    await usuario.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(campo).toHaveFocus()
  })

  it('"Limpar" zera o valor e "Concluir" só fecha', async () => {
    const aoMudar = vi.fn()
    const usuario = userEvent.setup()
    render(<DataControlada inicial="2099-11-12T19:30" aoMudar={aoMudar} />)

    await usuario.click(screen.getByLabelText('Quando'))
    await usuario.click(screen.getByRole('button', { name: 'Concluir' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(aoMudar).not.toHaveBeenCalled()

    await usuario.click(screen.getByLabelText('Quando'))
    await usuario.click(screen.getByRole('button', { name: 'Limpar' }))
    expect(aoMudar).toHaveBeenLastCalledWith('')
    expect(screen.getByLabelText('Quando')).toHaveTextContent('Selecionar data e hora')
  })

  it('o Escape fecha só o calendário (não propaga para um modal em volta)', () => {
    const aoEscape = vi.fn()
    document.addEventListener('keydown', aoEscape)
    render(<DataControlada inicial="2099-11-12T19:30" />)
    fireEvent.click(screen.getByLabelText('Quando'))
    fireEvent.keyDown(screen.getByRole('dialog', { name: 'Escolher data e hora' }), { key: 'Escape' })
    document.removeEventListener('keydown', aoEscape)
    expect(aoEscape).not.toHaveBeenCalled()
  })
})

describe('CampoSenha e CampoBusca', () => {
  it('a senha alterna entre oculta e visível por um botão próprio', async () => {
    const usuario = userEvent.setup()
    render(
      <>
        <label htmlFor="s">Senha</label>
        <CampoSenha id="s" />
      </>,
    )
    const campo = screen.getByLabelText('Senha')
    expect(campo).toHaveAttribute('type', 'password')
    await usuario.click(screen.getByRole('button', { name: 'Mostrar senha' }))
    expect(campo).toHaveAttribute('type', 'text')
    expect(screen.getByRole('button', { name: 'Ocultar senha', pressed: true })).toBeInTheDocument()
  })

  it('a busca mostra o botão de limpar só quando há texto', async () => {
    const usuario = userEvent.setup()
    function Busca() {
      const [v, setV] = useState('')
      return <CampoBusca aria-label="Buscar" value={v} onChange={setV} />
    }
    render(<Busca />)
    expect(screen.queryByRole('button', { name: 'Limpar busca' })).not.toBeInTheDocument()
    await usuario.type(screen.getByRole('searchbox', { name: 'Buscar' }), 'oi')
    await usuario.click(screen.getByRole('button', { name: 'Limpar busca' }))
    expect(screen.getByRole('searchbox', { name: 'Buscar' })).toHaveValue('')
    expect(screen.queryByRole('button', { name: 'Limpar busca' })).not.toBeInTheDocument()
  })
})
