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

const PESOS_CNPJ_1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
const PESOS_CNPJ_2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]

/** Dígitos verificadores do CNPJ, numérico ou alfanumérico (cada caractere vale o código ASCII − 48). Mesma regra da API. */
export function cnpjValido(valor: string): boolean {
  const c = valor.toUpperCase().replace(/[\s./-]/g, '')
  if (!/^[A-Z0-9]{12}[0-9]{2}$/.test(c) || new Set(c).size === 1) return false
  const digito = (pesos: number[]) => {
    const resto = pesos.reduce((soma, peso, i) => soma + (c.charCodeAt(i) - 48) * peso, 0) % 11
    return resto < 2 ? 0 : 11 - resto
  }
  return Number(c[12]) === digito(PESOS_CNPJ_1) && Number(c[13]) === digito(PESOS_CNPJ_2)
}

export const cnpjSchema = z.object({
  cnpj: z.string().trim().min(1, 'Informe o CNPJ.').refine(cnpjValido, 'Informe um CNPJ válido.'),
})
export type CnpjForm = z.infer<typeof cnpjSchema>

export const codigoTelefoneSchema = z.object({
  codigo: z.string().regex(/^\d{6}$/, 'O código deve ter exatamente 6 dígitos numéricos.'),
})
export type CodigoTelefoneForm = z.infer<typeof codigoTelefoneSchema>
