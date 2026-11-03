import QRCode from 'qrcode'
import fs from 'node:fs'

/**
 * Grava um vídeo .y4m com um QR code no centro, para o Chromium usar como câmera
 * (--use-file-for-fake-video-capture). Assim o roteiro testa o leitor de check-in de verdade.
 */
export function gravarVideoComQr(texto, arquivo, { largura = 640, altura = 480, quadros = 20 } = {}) {
  const qr = QRCode.create(texto, { errorCorrectionLevel: 'M' })
  const n = qr.modules.size
  const margem = 4
  const escala = Math.floor((altura * 0.75) / (n + margem * 2))
  const lado = (n + margem * 2) * escala
  const x0 = Math.floor((largura - lado) / 2)
  const y0 = Math.floor((altura - lado) / 2)

  const luma = Buffer.alloc(largura * altura, 90)
  for (let y = 0; y < lado; y++) {
    for (let x = 0; x < lado; x++) {
      const mx = Math.floor(x / escala) - margem
      const my = Math.floor(y / escala) - margem
      const escuro = mx >= 0 && my >= 0 && mx < n && my < n && qr.modules.get(my, mx)
      luma[(y0 + y) * largura + (x0 + x)] = escuro ? 16 : 235
    }
  }
  const croma = Buffer.alloc((largura / 2) * (altura / 2), 128)
  const partes = [Buffer.from(`YUV4MPEG2 W${largura} H${altura} F10:1 Ip A1:1 C420jpeg\n`)]
  for (let i = 0; i < quadros; i++) partes.push(Buffer.from('FRAME\n'), luma, croma, croma)
  fs.writeFileSync(arquivo, Buffer.concat(partes))
}
