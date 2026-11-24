import { useEffect, useRef, useState } from 'react'

// Leitor de QR code pela câmera. Usa o leitor nativo do navegador (BarcodeDetector: Chrome/Edge no Android e no
// desktop) e, quando ele não existe (Safari, Firefox), decodifica os quadros com a biblioteca jsQR.
// A câmera exige HTTPS (ou localhost) e a permissão do usuário; Permissions-Policy libera camera=(self).

type Estado = 'iniciando' | 'lendo' | 'sem-permissao' | 'sem-camera' | 'erro'

interface DetectorNativo {
  detect(fonte: CanvasImageSource): Promise<{ rawValue: string }[]>
}
type ConstrutorDetector = new (opcoes: { formats: string[] }) => DetectorNativo

const INTERVALO_MS = 200
// Enquanto o mesmo QR continua na frente da câmera, ele não é lido de novo; só vale outra leitura depois de ficar
// este tempo fora de vista (senão a mensagem de sucesso seria trocada por "já realizado" logo em seguida).
const AUSENCIA_MS = 3000
const CODIGO = /^[A-Z0-9]{12}$/

async function criarDecodificador(): Promise<(video: HTMLVideoElement, canvas: HTMLCanvasElement) => Promise<string | null>> {
  const Nativo = (globalThis as { BarcodeDetector?: ConstrutorDetector & { getSupportedFormats?: () => Promise<string[]> } }).BarcodeDetector
  if (Nativo && (await Nativo.getSupportedFormats?.())?.includes('qr_code')) {
    const detector = new Nativo({ formats: ['qr_code'] })
    return async (video) => (await detector.detect(video))[0]?.rawValue ?? null
  }
  const { default: jsQR } = await import('jsqr')
  return async (video, canvas) => {
    const largura = video.videoWidth
    const altura = video.videoHeight
    if (!largura || !altura) return null
    canvas.width = largura
    canvas.height = altura
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return null
    ctx.drawImage(video, 0, 0, largura, altura)
    const imagem = ctx.getImageData(0, 0, largura, altura)
    return jsQR(imagem.data, largura, altura, { inversionAttempts: 'dontInvert' })?.data ?? null
  }
}

export function LeitorQrCode({ aoLer, pausado }: { aoLer: (codigo: string) => void; pausado: boolean }) {
  const video = useRef<HTMLVideoElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [estado, setEstado] = useState<Estado>('iniciando')
  const [lidoInvalido, setLidoInvalido] = useState(false)
  // Refs para o laço de leitura enxergar o valor atual sem reiniciar a câmera.
  const pausadoRef = useRef(pausado)
  const aoLerRef = useRef(aoLer)
  useEffect(() => {
    pausadoRef.current = pausado
    aoLerRef.current = aoLer
  }, [pausado, aoLer])

  useEffect(() => {
    let ativo = true
    let fluxo: MediaStream | null = null
    let temporizador: ReturnType<typeof setTimeout> | undefined
    const ultimo = { codigo: '', vistoEm: 0 }

    const iniciar = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setEstado('sem-camera')
        return
      }
      try {
        fluxo = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      } catch (e) {
        const nome = (e as DOMException).name
        setEstado(nome === 'NotAllowedError' || nome === 'SecurityError' ? 'sem-permissao' : nome === 'NotFoundError' || nome === 'OverconstrainedError' ? 'sem-camera' : 'erro')
        return
      }
      if (!ativo || !video.current) {
        fluxo.getTracks().forEach((t) => t.stop())
        return
      }
      video.current.srcObject = fluxo
      try {
        await video.current.play()
      } catch {
        // Autoplay recusado: com muted + playsInline é raro; o quadro aparece quando o vídeo começar.
      }
      const decodificar = await criarDecodificador()
      if (!ativo) return
      setEstado('lendo')

      const passo = async () => {
        if (!ativo) return
        if (!pausadoRef.current && video.current && canvas.current && video.current.readyState >= 2) {
          const texto = await decodificar(video.current, canvas.current).catch(() => null)
          const codigo = texto?.trim().toUpperCase() ?? ''
          const agora = Date.now()
          const repetido = codigo === ultimo.codigo && agora - ultimo.vistoEm < AUSENCIA_MS
          if (codigo) ultimo.vistoEm = agora
          if (codigo && !repetido) {
            ultimo.codigo = codigo
            if (CODIGO.test(codigo)) {
              setLidoInvalido(false)
              aoLerRef.current(codigo)
            } else {
              setLidoInvalido(true)
            }
          }
        }
        temporizador = setTimeout(passo, INTERVALO_MS)
      }
      void passo()
    }

    void iniciar()
    return () => {
      ativo = false
      clearTimeout(temporizador)
      fluxo?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  const mensagens: Partial<Record<Estado, string>> = {
    iniciando: 'Abrindo a câmera…',
    'sem-permissao': 'O acesso à câmera foi negado. Libere a câmera nas permissões do navegador ou digite o código abaixo.',
    'sem-camera': 'Não encontramos uma câmera neste aparelho. Digite o código abaixo.',
    erro: 'Não foi possível abrir a câmera. Feche outros apps que a estejam usando ou digite o código abaixo.',
  }
  const problema = estado === 'sem-permissao' || estado === 'sem-camera' || estado === 'erro'

  return (
    <div className="leitor">
      {problema ? (
        <p className="alerta alerta--aviso" role="alert">
          {mensagens[estado]}
        </p>
      ) : (
        <>
          <div className="leitor__visor">
            <video ref={video} className="leitor__video" muted playsInline aria-label="Imagem da câmera" />
            <span className="leitor__mira" aria-hidden="true" />
            {estado === 'iniciando' && <span className="leitor__status">{mensagens.iniciando}</span>}
          </div>
          <p className="texto-suave texto-pequeno" aria-live="polite">
            {lidoInvalido ? 'Este QR code não é um código de check-in do Viteme.' : pausado ? 'Registrando…' : 'Aponte a câmera para o QR code do participante.'}
          </p>
        </>
      )}
      <canvas ref={canvas} hidden />
    </div>
  )
}
