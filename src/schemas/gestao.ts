import { z } from 'zod'
import { motivoSchema } from './evento'

export const colaboradorSchema = z.object({
  email: z.string().trim().min(1, 'Informe o e-mail.').max(160, 'O e-mail deve ter no máximo 160 caracteres.').pipe(z.email('Informe um e-mail válido.')),
})
export type ColaboradorForm = z.infer<typeof colaboradorSchema>

/** Código de check-in: 12 caracteres alfanuméricos, convertidos para maiúsculas. */
export const checkinSchema = z.object({
  codigoCheckin: z
    .string()
    .trim()
    .transform((v) => v.toUpperCase())
    .pipe(z.string().regex(/^[A-Z0-9]{12}$/, 'O código deve ter 12 caracteres alfanuméricos.')),
})
export type CheckinForm = z.input<typeof checkinSchema>

export const cancelamentoSchema = z.object({ motivo: motivoSchema })
export type CancelamentoForm = z.infer<typeof cancelamentoSchema>

export const MOTIVOS_DENUNCIA = [
  ['EVENTO_FALSO', 'Evento falso'],
  ['GOLPE', 'Golpe'],
  ['CONTEUDO_IMPROPRIO', 'Conteúdo impróprio'],
  ['SPAM', 'Spam'],
  ['OUTRO', 'Outro'],
] as const

export const denunciaSchema = z
  .object({
    motivo: z.enum(['EVENTO_FALSO', 'GOLPE', 'CONTEUDO_IMPROPRIO', 'SPAM', 'OUTRO'], { error: 'Escolha o motivo da denúncia.' }),
    descricao: z.string().trim().max(500, 'A descrição deve ter no máximo 500 caracteres.'),
  })
  .refine((v) => v.motivo !== 'OUTRO' || v.descricao.length > 0, { message: 'Descreva o motivo quando escolher "Outro".', path: ['descricao'] })
export type DenunciaForm = z.infer<typeof denunciaSchema>
