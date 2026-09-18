import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './app/router';
import { ensureSeedData } from './data/local/seed';
import { materializeRecurringRules } from './data/local/materialize';
import './styles/index.css';

void ensureSeedData().then(() => materializeRecurringRules());

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
