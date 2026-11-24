import type { Alteracao } from '../api/tipos'
import { dataEHora, moeda } from './formatar'

/** Nome mostrado para cada campo do histórico (RN13). A API devolve o nome técnico: "dataInicio", "programacao"... */
const ROTULO_CAMPO: Record<string, string> = {
  titulo: 'Título',
  dataInicio: 'Início',
  dataFim: 'Término',
  local: 'Local',
  programacao: 'Programação',
  preco: 'Preço',
  capacidade: 'Capacidade',
}

export function rotuloCampo(campo: string): string {
  return ROTULO_CAMPO[campo] ?? campo
}

// A API grava datas em ISO UTC ("2026-11-26T13:00:00Z"), também dentro da descrição de uma atividade.
const DATA_ISO = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?Z/g

/** Valor legível: datas no fuso do navegador e preço em reais. */
export function formatarValorAlteracao(campo: string, valor: string): string {
  if (campo === 'preco' && /^\d+(\.\d+)?$/.test(valor)) return moeda(Number(valor))
  return valor.replace(DATA_ISO, (iso) => dataEHora(iso))
}

/** Complemento depois do nome do campo; vazio quando não há valor para mostrar. */
export function descreverMudanca(a: Pick<Alteracao, 'campo' | 'valorAnterior' | 'valorNovo'>): string {
  const anterior = a.valorAnterior ? formatarValorAlteracao(a.campo, a.valorAnterior) : null
  const novo = a.valorNovo ? formatarValorAlteracao(a.campo, a.valorNovo) : null
  if (anterior && novo) return `de “${anterior}” para “${novo}”`
  if (novo) return `incluído: “${novo}”`
  if (anterior) return `removido: “${anterior}”`
  return ''
}
