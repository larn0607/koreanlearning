import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { App } from './App';
import { Home } from './pages/Home';
import { ListPage } from './pages/ListPage.tsx';
import { CategoryPage } from './pages/CategoryPage';
import { NotesCategoryPage } from './pages/NotesCategoryPage';
import { NotesListPage } from './pages/NotesListPage';
import { SentenceCategoryPage } from './pages/SentenceCategoryPage';
import { SentenceListPage } from './pages/SentenceListPage';
import { SentenceCheckPage } from './pages/SentenceCheckPage';
import { CheckPage } from './pages/CheckPage';
import { WrongItemsPage } from './pages/WrongItemsPage';
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
      { path: 'vocab/wrong', element: <WrongItemsPage /> },
      { path: 'vocab/:cardId/wrong', element: <WrongItemsPage /> },
      { path: 'grammar', element: <CategoryPage category="grammar" /> },
      { path: 'grammar/:cardId', element: <ListPage category="grammar" /> },
      { path: 'grammar/check', element: <CheckPage /> },
      { path: 'grammar/:cardId/check', element: <CheckPage /> },
      { path: 'grammar/wrong', element: <WrongItemsPage /> },
      { path: 'grammar/:cardId/wrong', element: <WrongItemsPage /> },
      { path: 'notes', element: <NotesCategoryPage /> },
      { path: 'notes/:cardId', element: <NotesListPage /> },
      { path: 'sentences', element: <SentenceCategoryPage /> },
      { path: 'sentences/:cardId', element: <SentenceListPage /> },
      { path: 'sentences/check', element: <SentenceCheckPage /> },
      { path: 'sentences/:cardId/check', element: <SentenceCheckPage /> },
      { path: 'sentences/wrong', element: <WrongItemsPage /> },
      { path: 'sentences/:cardId/wrong', element: <WrongItemsPage /> }
    ]
  }
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
