import QRCode from 'qrcode'
import { useEffect, useState } from 'react'

/** QR code gerado no próprio navegador (SVG). O conteúdo é só o código de check-in: nada sai do aparelho. */
export function QrCode({ valor, tamanho = 220, rotulo }: { valor: string; tamanho?: number; rotulo: string }) {
  const [svg, setSvg] = useState<{ valor: string; url: string } | null>(null)

  useEffect(() => {
    let ativo = true
    QRCode.toString(valor, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#171d42', light: '#ffffff' } })
      .then((texto) => ativo && setSvg({ valor, url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(texto)}` }))
      .catch(() => ativo && setSvg(null))
    return () => {
      ativo = false
    }
  }, [valor])

  return (
    <div className="qr" style={{ width: tamanho, height: tamanho }}>
      {svg?.valor === valor ? <img src={svg.url} width={tamanho} height={tamanho} alt={rotulo} /> : <span className="sr-only">Gerando QR code…</span>}
    </div>
  )
}
