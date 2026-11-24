import { useEffect, useId, useLayoutEffect, useRef, useState, type ComponentProps, type FocusEvent as ReactFocusEvent, type KeyboardEvent, type MouseEvent as ReactMouseEvent } from 'react'
import {
  HORA_PADRAO,
  HORARIOS_RAPIDOS,
  SIGLAS_DIAS,
  NOMES_DIAS,
  adicionarDias,
  adicionarMeses,
  chaveDeDataBr,
  chaveDia,
  dataBrDaChave,
  dataDaChave,
  dividirValor,
  horaValida,
  juntarValor,
  mascaraData,
  mascaraHora,
  rotuloDoDia,
  semanasDoMes,
  tituloDoMes,
} from '../lib/calendario'
import { Icone } from './Icone'

interface SeletorDataHoraProps {
  id?: string
  /** "AAAA-MM-DDTHH:mm" ou vazio. */
  value: string
  onChange: (valor: string) => void
  onBlur?: () => void
  /** Menor data e hora aceitas ("AAAA-MM-DDTHH:mm"): os dias anteriores ficam desabilitados no calendário. */
  min?: string
  placeholder?: string
  disabled?: boolean
  ref?: ComponentProps<'button'>['ref']
  'aria-invalid'?: boolean
  'aria-describedby'?: string
}

/**
 * Seletor de data e hora próprio: calendário navegável por teclado (setas, Home/End, PageUp/PageDown), campos de
 * data e hora com máscara para digitar, e horários rápidos. Substitui o `<input type="datetime-local">` nativo.
 * Cada alteração válida já chama `onChange`; "Concluir" só fecha.
 */
export function SeletorDataHora({ id, value, onChange, onBlur, min, placeholder = 'Selecionar data e hora', disabled, ref, ...aria }: SeletorDataHoraProps) {
  const idDialogo = useId()
  const idData = useId()
  const idHora = useId()
  const raiz = useRef<HTMLDivElement>(null)
  const botao = useRef<HTMLButtonElement | null>(null)
  const moverFoco = useRef(false)
  const dialogo = useRef<HTMLDivElement>(null)
  const [alturaMaxima, setAlturaMaxima] = useState<number | undefined>(undefined)
  // Data e hora vêm preenchidas (a hora padrão entra junto com a data) e têm maxLength: sem selecionar o texto ao
  // entrar no campo, o que se digita é ignorado e a hora fica em 08:00 sem aviso.
  const selecionouAoFocar = useRef(false)
  const selecionarAoEntrar = {
    onFocus: (e: ReactFocusEvent<HTMLInputElement>) => {
      e.currentTarget.select()
      selecionouAoFocar.current = true
    },
    // O mouseup do mesmo clique desfaria a seleção feita no foco.
    onMouseUp: (e: ReactMouseEvent<HTMLInputElement>) => {
      if (selecionouAoFocar.current) e.preventDefault()
      selecionouAoFocar.current = false
    },
  }
  const [aberto, setAberto] = useState(false)
  const [acima, setAcima] = useState(false)
  const [visivel, setVisivel] = useState({ ano: 2000, mes: 0 })
  const [foco, setFoco] = useState('')
  const [textoData, setTextoData] = useState('')
  const [textoHora, setTextoHora] = useState('')

  const { dia, hora } = dividirValor(value)
  const minDia = min ? min.slice(0, 10) : ''
  const hoje = chaveDia(new Date())
  const idDia = (chave: string) => `${idDialogo}-${chave}`

  const abrir = () => {
    const caixa = raiz.current?.getBoundingClientRect()
    if (caixa) {
      const abaixo = window.innerHeight - caixa.bottom
      // O cabeçalho fixo cobre o topo da tela: só abre para cima se o calendário couber inteiro abaixo dele.
      const topoLivre = document.querySelector('header')?.getBoundingClientRect().bottom ?? 0
      setAcima(abaixo < 460 && caixa.top - topoLivre >= 460)
    }
    const base = dataDaChave(dia) ?? dataDaChave(minDia > hoje ? minDia : hoje) ?? new Date()
    setVisivel({ ano: base.getFullYear(), mes: base.getMonth() })
    setFoco(chaveDia(base))
    setTextoData(dia ? dataBrDaChave(dia) : '')
    setTextoHora(hora)
    moverFoco.current = true
    setAlturaMaxima(undefined)
    setAberto(true)
  }

  const fechar = (devolverFoco = false) => {
    setAberto(false)
    if (devolverFoco) botao.current?.focus()
  }

  // A altura real varia (meses com 6 semanas, fonte maior): se, aberto para cima, o calendário encostar no cabeçalho
  // fixo, vira para baixo antes de pintar.
  useLayoutEffect(() => {
    if (!aberto || !dialogo.current) return
    const caixa = dialogo.current.getBoundingClientRect()
    const topoLivre = document.querySelector('header')?.getBoundingClientRect().bottom ?? 0
    // No celular a barra de abas fica presa embaixo e também cobre o calendário.
    const barra = document.querySelector('.barra-abas')?.getBoundingClientRect()
    const fundoLivre = barra && barra.height > 0 ? Math.min(barra.top, window.innerHeight) : window.innerHeight
    if (acima && caixa.top < topoLivre) {
      setAcima(false) // o efeito roda de novo, já com o calendário embaixo
      return
    }
    // Tela baixa (notebook pequeno, celular deitado): o calendário não cabe entre o cabeçalho e a barra; rola por dentro.
    const espaco = fundoLivre - topoLivre - 16
    setAlturaMaxima(caixa.height > espaco ? Math.max(espaco, 240) : undefined)
    // Aberto para baixo perto do fim da tela, o calendário ficava fora da área visível: rola até ele.
    if (!acima && caixa.bottom > fundoLivre) {
      const altura = Math.min(caixa.height, Math.max(espaco, 240))
      window.scrollBy({ top: Math.min(caixa.top + altura - fundoLivre + 8, caixa.top - topoLivre - 8) })
    }
  }, [aberto, acima])

  useEffect(() => {
    if (!aberto) return
    const fora = (e: MouseEvent) => {
      if (!raiz.current?.contains(e.target as Node)) setAberto(false)
    }
    document.addEventListener('mousedown', fora)
    return () => document.removeEventListener('mousedown', fora)
  }, [aberto])

  useEffect(() => {
    if (aberto && moverFoco.current) {
      moverFoco.current = false
      document.getElementById(idDia(foco))?.focus()
    }
    // idDia depende só de idDialogo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, foco, visivel])

  const irParaDia = (chave: string, comFoco: boolean) => {
    const d = dataDaChave(chave)
    if (!d) return
    moverFoco.current = comFoco
    setVisivel({ ano: d.getFullYear(), mes: d.getMonth() })
    setFoco(chave)
  }

  const escolherDia = (chave: string) => {
    const h = horaValida(textoHora) ? textoHora : HORA_PADRAO
    setTextoData(dataBrDaChave(chave))
    setTextoHora(h)
    irParaDia(chave, false)
    onChange(juntarValor(chave, h))
  }

  const aoDigitarData = (bruto: string) => {
    const texto = mascaraData(bruto)
    setTextoData(texto)
    const chave = chaveDeDataBr(texto)
    if (!chave) return
    const h = horaValida(textoHora) ? textoHora : HORA_PADRAO
    setTextoHora(h)
    irParaDia(chave, false)
    onChange(juntarValor(chave, h))
  }

  const definirHora = (h: string) => {
    setTextoHora(h)
    const chave = chaveDeDataBr(textoData)
    if (horaValida(h) && chave) onChange(juntarValor(chave, h))
  }

  const mudarMes = (delta: number) => {
    const atual = dataDaChave(foco) ?? new Date(visivel.ano, visivel.mes, 1)
    let alvo = chaveDia(adicionarMeses(atual, delta))
    if (minDia && alvo < minDia) alvo = minDia
    irParaDia(alvo, false)
  }

  const aoTeclarNaGrade = (e: KeyboardEvent<HTMLTableSectionElement>) => {
    const atual = dataDaChave(foco)
    if (!atual) return
    const alvo: Date | null =
      e.key === 'ArrowLeft' ? adicionarDias(atual, -1)
      : e.key === 'ArrowRight' ? adicionarDias(atual, 1)
      : e.key === 'ArrowUp' ? adicionarDias(atual, -7)
      : e.key === 'ArrowDown' ? adicionarDias(atual, 7)
      : e.key === 'Home' ? adicionarDias(atual, -atual.getDay())
      : e.key === 'End' ? adicionarDias(atual, 6 - atual.getDay())
      : e.key === 'PageUp' ? adicionarMeses(atual, e.shiftKey ? -12 : -1)
      : e.key === 'PageDown' ? adicionarMeses(atual, e.shiftKey ? 12 : 1)
      : null
    if (!alvo) return
    e.preventDefault()
    const chave = chaveDia(alvo)
    if (minDia && chave < minDia) return
    irParaDia(chave, true)
  }

  const minAnoMes = minDia ? Number(minDia.slice(0, 4)) * 12 + Number(minDia.slice(5, 7)) - 1 : -Infinity
  const mesAnteriorBloqueado = visivel.ano * 12 + visivel.mes <= minAnoMes
  const semanas = semanasDoMes(visivel.ano, visivel.mes)

  return (
    <div className="seletor" ref={raiz}>
      <button
        {...aria}
        ref={(no) => {
          botao.current = no
          if (typeof ref === 'function') ref(no)
          else if (ref) ref.current = no
        }}
        id={id}
        type="button"
        className="entrada seletor__botao"
        data-vazio={!value}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={aberto}
        aria-controls={idDialogo}
        onClick={() => (aberto ? fechar() : abrir())}
        onBlur={(e) => {
          if (aberto && !raiz.current?.contains(e.relatedTarget as Node | null)) setAberto(false)
        }}
      >
        <span className="seletor__texto">{value && dia ? `${dataBrDaChave(dia)} às ${hora}` : placeholder}</span>
        <Icone nome="eventos" tamanho={18} />
      </button>

      {aberto && (
        <div
          className={acima ? 'calendario calendario--acima' : 'calendario'}
          ref={dialogo}
          style={alturaMaxima ? { maxHeight: alturaMaxima, overflowY: 'auto' } : undefined}
          id={idDialogo}
          role="dialog"
          aria-label="Escolher data e hora"
          tabIndex={-1}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault()
              e.stopPropagation()
              fechar(true)
              onBlur?.()
            }
          }}
          onBlur={(e) => {
            // Foco indo para fora do calendário (Tab): fecha. Cliques em áreas sem foco não chegam aqui com relatedTarget.
            if (e.relatedTarget && !raiz.current?.contains(e.relatedTarget as Node)) {
              setAberto(false)
              onBlur?.()
            }
          }}
        >
          <div className="calendario__topo">
            <button type="button" className="botao-icone calendario__nav" aria-label="Mês anterior" disabled={mesAnteriorBloqueado} onClick={() => mudarMes(-1)}>
              <Icone nome="esquerda" tamanho={18} />
            </button>
            <strong className="calendario__titulo" aria-live="polite">
              {tituloDoMes(visivel.ano, visivel.mes)}
            </strong>
            <button type="button" className="botao-icone calendario__nav" aria-label="Próximo mês" onClick={() => mudarMes(1)}>
              <Icone nome="direita" tamanho={18} />
            </button>
          </div>

          <table className="calendario__grade" role="grid" aria-label={tituloDoMes(visivel.ano, visivel.mes)}>
            <thead>
              <tr>
                {SIGLAS_DIAS.map((sigla, i) => (
                  <th key={sigla} scope="col" abbr={NOMES_DIAS[i]}>
                    {sigla}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody onKeyDown={aoTeclarNaGrade}>
              {semanas.map((semana) => (
                <tr key={chaveDia(semana[0]!)}>
                  {semana.map((d) => {
                    const chave = chaveDia(d)
                    const desativado = Boolean(minDia) && chave < minDia
                    return (
                      <td key={chave}>
                        <button
                          type="button"
                          id={idDia(chave)}
                          className="calendario__dia"
                          tabIndex={chave === foco ? 0 : -1}
                          disabled={desativado}
                          aria-label={rotuloDoDia(d)}
                          aria-pressed={chave === dia}
                          aria-current={chave === hoje ? 'date' : undefined}
                          data-fora={d.getMonth() !== visivel.mes}
                          onClick={() => escolherDia(chave)}
                        >
                          {d.getDate()}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          <div className="calendario__campos">
            <div className="campo">
              <label className="campo__rotulo" htmlFor={idData}>
                Data
              </label>
              <input id={idData} className="entrada" inputMode="numeric" autoComplete="off" placeholder="dd/mm/aaaa" maxLength={10} value={textoData} onChange={(e) => aoDigitarData(e.target.value)} {...selecionarAoEntrar} />
            </div>
            <div className="campo">
              <label className="campo__rotulo" htmlFor={idHora}>
                Hora
              </label>
              <input id={idHora} className="entrada" inputMode="numeric" autoComplete="off" placeholder="hh:mm" maxLength={5} value={textoHora} onChange={(e) => definirHora(mascaraHora(e.target.value))} {...selecionarAoEntrar} />
            </div>
          </div>

          <div className="calendario__rapidos" role="group" aria-label="Horários rápidos">
            {HORARIOS_RAPIDOS.map((h) => (
              <button key={h} type="button" className="chip" aria-pressed={textoHora === h} onClick={() => definirHora(h)}>
                {h}
              </button>
            ))}
          </div>

          <div className="calendario__rodape">
            <button
              type="button"
              className="botao-link botao-link--discreto"
              onClick={() => {
                onChange('')
                setTextoData('')
                setTextoHora('')
                fechar(true)
                onBlur?.()
              }}
            >
              Limpar
            </button>
            <button
              type="button"
              className="botao botao--pequeno"
              onClick={() => {
                fechar(true)
                onBlur?.()
              }}
            >
              Concluir
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
