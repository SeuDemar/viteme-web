import { useId } from 'react'

/**
 * Marca do Viteme: um envelope de vidro cuja aba aberta é o V do nome, em coral.
 * Os gradientes têm ids próprios por instância, para a marca poder aparecer mais de uma vez na página.
 */
export function LogoMarca({ altura = 30 }: { altura?: number }) {
  const id = useId()
  const ref = (nome: string) => `${id}-${nome}`
  return (
    <svg className="logo__marca" height={altura} width={(altura * 96) / 80} viewBox="0 0 96 80" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={ref('vidro')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#d3f0fb" />
        </linearGradient>
        <linearGradient id={ref('aro')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#34c6e4" />
          <stop offset="1" stopColor="#0a6aa8" />
        </linearGradient>
        <linearGradient id={ref('coral')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff9a88" />
          <stop offset="1" stopColor="#f2574a" />
        </linearGradient>
        <clipPath id={ref('corpo')}>
          <rect x="5" y="11" width="86" height="60" rx="15" />
        </clipPath>
      </defs>
      <rect x="5" y="11" width="86" height="60" rx="15" fill={`url(#${ref('vidro')})`} />
      <g clipPath={`url(#${ref('corpo')})`}>
        <ellipse cx="48" cy="9" rx="56" ry="26" fill="#fff" opacity="0.7" />
      </g>
      <rect x="5" y="11" width="86" height="60" rx="15" fill="none" stroke={`url(#${ref('aro')})`} strokeWidth="3" />
      <path d="M22 22 48 49 74 22" fill="none" stroke={`url(#${ref('coral')})`} strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M26 23 48 45" fill="none" stroke="#fff" strokeOpacity="0.45" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M84 3 86 10 93 12 86 14 84 21 82 14 75 12 82 10Z" fill="#34c6e4" />
    </svg>
  )
}
