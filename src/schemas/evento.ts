import { z } from 'zod'

const campoDataHora = (mensagem: string) => z.string().min(1, mensagem).refine((v) => !Number.isNaN(new Date(v).getTime()), 'Data e hora inválidas.')

const inteiroPositivoOpcional = (mensagem: string) =>
  z.string().refine((v) => v.trim() === '' || (/^\d+$/.test(v.trim()) && Number(v) > 0), mensagem)

/** Aceita "25", "25,5" ou "25,50": até 2 casas, de 0 a 99.999,99. */
export const precoSchema = z
  .string()
  .min(1, 'Informe o preço (0 para evento gratuito).')
  .refine((v) => /^\d+([.,]\d{1,2})?$/.test(v.trim()), 'Use no máximo duas casas decimais, ex.: 25,00.')
  .refine((v) => Number(v.trim().replace(',', '.')) <= 99999.99, 'O preço deve estar entre 0 e 99.999,99.')

export const paraNumeroPreco = (v: string) => Number(v.trim().replace(',', '.'))

export const eventoSchema = z
  .object({
    titulo: z.string().trim().min(5, 'O título deve ter entre 5 e 150 caracteres.').max(150, 'O título deve ter entre 5 e 150 caracteres.'),
    descricao: z.string().trim().min(1, 'Informe a descrição.').max(5000, 'A descrição deve ter no máximo 5000 caracteres.'),
    categoria: z.string().min(1, 'Informe a categoria.').max(60, 'A categoria deve ter no máximo 60 caracteres.'),
    local: z.string().trim().min(1, 'Informe o local.').max(200, 'O local deve ter no máximo 200 caracteres.'),
    imagemUrl: z
      .string()
      .trim()
      .max(500, 'A URL da imagem deve ter no máximo 500 caracteres.')
      .refine((v) => v === '' || /^https:\/\/\S+$/i.test(v), 'A imagem deve ser um endereço https.'),
    dataInicio: campoDataHora('Informe a data de início.'),
    dataFim: campoDataHora('Informe a data de término.'),
    inscricaoInicio: campoDataHora('Informe o início das inscrições.'),
    inscricaoFim: campoDataHora('Informe o fim das inscrições.'),
    capacidade: inteiroPositivoOpcional('A capacidade deve ser um número inteiro maior que zero.'),
    preco: precoSchema,
    cargaHoraria: inteiroPositivoOpcional('A carga horária deve ser um número inteiro maior que zero.'),
    motivoAlteracao: z.string().trim().max(300, 'O motivo deve ter entre 10 e 300 caracteres.'),
  })
  .superRefine((v, ctx) => {
    const t = (s: string) => new Date(s).getTime()
    if (v.dataInicio && v.dataFim && t(v.dataFim) <= t(v.dataInicio)) {
      ctx.addIssue({ code: 'custom', message: 'A data de término deve ser posterior à data de início.', path: ['dataFim'] })
    }
    if (v.inscricaoInicio && v.inscricaoFim) {
      if (t(v.inscricaoFim) <= t(v.inscricaoInicio)) {
        ctx.addIssue({ code: 'custom', message: 'O fim das inscrições deve ser posterior ao início das inscrições.', path: ['inscricaoFim'] })
      } else if (v.dataInicio && t(v.inscricaoFim) > t(v.dataInicio)) {
        ctx.addIssue({ code: 'custom', message: 'As inscrições devem terminar até o início do evento.', path: ['inscricaoFim'] })
      }
    }
  })
export type EventoForm = z.infer<typeof eventoSchema>

export const motivoSchema = z.string().trim().min(10, 'O motivo deve ter entre 10 e 300 caracteres.').max(300, 'O motivo deve ter entre 10 e 300 caracteres.')

export const atividadeSchema = z
  .object({
    titulo: z.string().trim().min(3, 'O título deve ter entre 3 e 150 caracteres.').max(150, 'O título deve ter entre 3 e 150 caracteres.'),
    palestrante: z.string().trim().max(120, 'O palestrante deve ter no máximo 120 caracteres.'),
    local: z.string().trim().max(200, 'O local deve ter no máximo 200 caracteres.'),
    inicio: campoDataHora('Informe o início da atividade.'),
    fim: campoDataHora('Informe o término da atividade.'),
    motivoAlteracao: z.string().trim().max(300, 'O motivo deve ter entre 10 e 300 caracteres.'),
  })
  .superRefine((v, ctx) => {
    if (v.inicio && v.fim && new Date(v.fim).getTime() <= new Date(v.inicio).getTime()) {
      ctx.addIssue({ code: 'custom', message: 'O término deve ser posterior ao início.', path: ['fim'] })
    }
  })
export type AtividadeForm = z.infer<typeof atividadeSchema>
