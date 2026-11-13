import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import Painel from './pages/Painel'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Painel />
  </StrictMode>,
)
