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

/** CPF com dígitos verificadores, com ou sem máscara. Mesma regra da API. */
export function cpfValido(valor: string): boolean {
  const c = valor.replace(/[\s.-]/g, '')
  if (!/^\d{11}$/.test(c) || new Set(c).size === 1) return false
  const digito = (n: number) => {
    const soma = [...c.slice(0, n)].reduce((s, d, i) => s + Number(d) * (n + 1 - i), 0)
    const resto = (soma * 10) % 11
    return resto === 10 ? 0 : resto
  }
  return Number(c[9]) === digito(9) && Number(c[10]) === digito(10)
}

export const cpfSchema = z.object({
  cpf: z.string().trim().min(1, 'Informe o CPF.').refine(cpfValido, 'Informe um CPF válido.'),
})
export type CpfForm = z.infer<typeof cpfSchema>

export const esqueciSenhaSchema = z.object({
  email: z.string().trim().min(1, 'Informe o e-mail.').max(160, 'O e-mail deve ter no máximo 160 caracteres.').pipe(z.email('Informe um e-mail válido.')),
})
export type EsqueciSenhaForm = z.infer<typeof esqueciSenhaSchema>

export const redefinirSenhaSchema = z
  .object({
    novaSenha: senhaForte,
    confirmarSenha: z.string().min(1, 'Confirme a senha.'),
  })
  .refine((v) => v.novaSenha === v.confirmarSenha, { message: 'A confirmação deve ser igual à senha.', path: ['confirmarSenha'] })
export type RedefinirSenhaForm = z.infer<typeof redefinirSenhaSchema>

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

/** Valor em reais digitado como "5000", "5.000" ou "5.000,50". */
export function valorEmReais(valor: string): number {
  const limpo = valor.trim().replace(/[R$\s]/g, '')
  const normalizado = limpo.includes(',') ? limpo.replace(/\./g, '').replace(',', '.') : limpo.replace(/\.(?=\d{3}(\D|$))/g, '')
  return Number(normalizado)
}

/** E41: dados da empresa para abrir a conta de recebimento. CNPJ, razão social e e-mail vêm do perfil. */
export const contaRecebimentoSchema = z.object({
  tipoEmpresa: z.enum(['MEI', 'LIMITED', 'INDIVIDUAL', 'ASSOCIATION'], { message: 'Escolha o tipo de empresa.' }),
  telefone: z.string().refine((v) => [10, 11].includes(digitosTelefone(v).length), 'Informe o telefone com DDD, ex.: (44) 99999-9999.'),
  faturamentoMensal: z.string().refine((v) => valorEmReais(v) >= 1, 'Informe o faturamento mensal em reais.'),
  cep: z.string().refine((v) => v.replace(/\D/g, '').length === 8, 'Informe o CEP com 8 dígitos.'),
  endereco: z.string().trim().min(1, 'Informe o endereço.').max(200, 'Use até 200 caracteres.'),
  numero: z.string().trim().min(1, 'Informe o número.').max(20, 'Use até 20 caracteres.'),
  complemento: z.string().trim().max(100, 'Use até 100 caracteres.'),
  bairro: z.string().trim().min(1, 'Informe o bairro.').max(100, 'Use até 100 caracteres.'),
})
export type ContaRecebimentoForm = z.infer<typeof contaRecebimentoSchema>

export const codigoTelefoneSchema = z.object({
  codigo: z.string().regex(/^\d{6}$/, 'O código deve ter exatamente 6 dígitos numéricos.'),
})
export type CodigoTelefoneForm = z.infer<typeof codigoTelefoneSchema>
