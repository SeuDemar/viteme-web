import { z } from 'zod'

const digitosTelefone = (v: string) => v.replace(/\D/g, '')

/** Telefone brasileiro com DDD: 10 ou 11 dígitos. Vazio é permitido (campo opcional). */
export const telefoneOpcional = z
  .string()
  .refine((v) => v.trim() === '' || [10, 11].includes(digitosTelefone(v).length), 'Informe o telefone com DDD, ex.: (44) 99999-9999.')

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Informe o e-mail.').pipe(z.email('Informe um e-mail válido.')),
  senha: z.string().min(1, 'Informe a senha.'),
})
export type LoginForm = z.infer<typeof loginSchema>

export const senhaForte = z
  .string()
  .min(8, 'A senha deve ter no mínimo 8 caracteres.')
  .refine((v) => /[A-Za-z]/.test(v), 'A senha deve ter pelo menos uma letra.')
  .refine((v) => /\d/.test(v), 'A senha deve ter pelo menos um número.')

export const cadastroSchema = z
  .object({
    nome: z.string().trim().min(3, 'O nome deve ter entre 3 e 120 caracteres.').max(120, 'O nome deve ter entre 3 e 120 caracteres.'),
    email: z.string().trim().min(1, 'Informe o e-mail.').max(160, 'O e-mail deve ter no máximo 160 caracteres.').pipe(z.email('Informe um e-mail válido.')),
    senha: senhaForte,
    confirmarSenha: z.string().min(1, 'Confirme a senha.'),
    telefone: telefoneOpcional,
  })
  .refine((v) => v.senha === v.confirmarSenha, { message: 'A confirmação deve ser igual à senha.', path: ['confirmarSenha'] })
export type CadastroForm = z.infer<typeof cadastroSchema>

export const perfilSchema = z.object({
  nome: cadastroSchema.shape.nome,
  telefone: telefoneOpcional,
})
export type PerfilForm = z.infer<typeof perfilSchema>

export const codigoTelefoneSchema = z.object({
  codigo: z.string().regex(/^\d{6}$/, 'O código deve ter exatamente 6 dígitos numéricos.'),
})
export type CodigoTelefoneForm = z.infer<typeof codigoTelefoneSchema>
