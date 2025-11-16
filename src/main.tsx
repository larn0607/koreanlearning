import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { App } from './App';
import { Home } from './pages/Home';
import { ListPage } from './pages/ListPage.tsx';
import { CategoryPage } from './pages/CategoryPage';
import { NotesCategoryPage } from './pages/NotesCategoryPage';
import { NotesListPage } from './pages/NotesListPage';
import { CheckPage } from './pages/CheckPage';
import './styles.css';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Home /> },
      { path: 'vocab', element: <CategoryPage category="vocab" /> },
      { path: 'vocab/:cardId', element: <ListPage category="vocab" /> },
      { path: 'vocab/check', element: <CheckPage /> },
      { path: 'vocab/:cardId/check', element: <CheckPage /> },
      { path: 'grammar', element: <CategoryPage category="grammar" /> },
      { path: 'grammar/:cardId', element: <ListPage category="grammar" /> },
      { path: 'grammar/check', element: <CheckPage /> },
      { path: 'grammar/:cardId/check', element: <CheckPage /> },
      { path: 'notes', element: <NotesCategoryPage /> },
      { path: 'notes/:cardId', element: <NotesListPage /> }
    ]
  }
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
