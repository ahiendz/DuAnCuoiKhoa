import React from 'react'
import ReactDOM from 'react-dom/client'
import Dashboard from '../Dashboard'
import { ThemeProvider } from '../../src/context/ThemeContext'
import '../../src/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <ThemeProvider>
            <Dashboard />
        </ThemeProvider>
    </React.StrictMode>,
)
