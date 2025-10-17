import { createRoot } from 'react-dom/client';
import App from './pages/App';
import './index.css'; // <-- Import Tailwind CSS

createRoot(document.getElementById('root')!).render(<App />);