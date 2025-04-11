
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Add Inter font
const inter = document.createElement('link');
inter.rel = 'stylesheet';
inter.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap';
document.head.appendChild(inter);

createRoot(document.getElementById("root")!).render(<App />);
