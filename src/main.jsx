import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './i18n/config' 
import './index.css'
import App from './App.jsx'
import { Analytics } from '@vercel/analytics/react'

createRoot(document.getElementById('root')).render(
    <BrowserRouter>
      <App />
      <Analytics />
    </BrowserRouter>
)