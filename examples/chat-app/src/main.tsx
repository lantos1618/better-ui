import { StrictMode } from 'react';
// Force light mode by removing dark class and preventing it from being added
document.documentElement.classList.remove('dark');

// Override the system preference detection
const forceLightMode = () => {
  // Always set dark mode to false regardless of localStorage or system preference
  document.documentElement.classList.toggle(
    'dark',
    false // Force to false instead of checking localStorage or system preference
  );
};

// Run immediately
forceLightMode();

// Also run when the DOM is loaded to ensure it applies
document.addEventListener('DOMContentLoaded', forceLightMode);

// Override system preference changes
const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
mediaQuery.addEventListener('change', forceLightMode);

import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { RootDnd } from './dnd-kit/RootDnd.tsx';
import { DragStateProvider } from './dnd-kit/DragStateContext.tsx';
import { MoveProvider } from './dnd-kit/MoveContext.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MoveProvider>
      <DragStateProvider>
        <RootDnd>
          <App />
        </RootDnd>
      </DragStateProvider>
    </MoveProvider>
  </StrictMode>
);
