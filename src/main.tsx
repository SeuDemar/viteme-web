import '@fontsource-variable/inter'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/global.css'

// Depois de um novo deploy, uma aba aberta pode pedir telas (chunks) que já não existem: recarrega uma vez.
// A marca na sessão evita recarregar em laço se o problema for outro (por exemplo, sem internet).
window.addEventListener('vite:preloadError', (evento) => {
  try {
    if (sessionStorage.getItem('viteme:recarregado')) return
    sessionStorage.setItem('viteme:recarregado', '1')
  } catch {
    return
  }
  evento.preventDefault()
  window.location.reload()
})
window.addEventListener('load', () => {
  setTimeout(() => {
    try {
      sessionStorage.removeItem('viteme:recarregado')
    } catch {
      // Armazenamento indisponível: nada a limpar.
    }
  }, 10_000)
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
