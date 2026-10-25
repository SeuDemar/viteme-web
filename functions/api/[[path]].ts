// Cloudflare Pages Function: repassa tudo que começa com /api/ para a API (veja edge/proxy.ts).
import { repassarParaApi, type Env } from '../../edge/proxy'

export const onRequest = ({ request, env }: { request: Request; env: Env }) => repassarParaApi(request, env)
