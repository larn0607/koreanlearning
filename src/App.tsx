import { useEffect, useState } from 'react';
import { Outlet, Link, NavLink } from 'react-router-dom';
import { getAppTitle, getStudyLanguage } from './utils/language';

export function App() {
  const [language, setLanguage] = useState(() => getStudyLanguage());

  useEffect(() => {
    const handleLanguageChange = () => setLanguage(getStudyLanguage());
    window.addEventListener('study-language-change', handleLanguageChange);
    return () => window.removeEventListener('study-language-change', handleLanguageChange);
  }, []);

  return (
    <div className="container">
      <header className="header">
        <Link to="/" className="brand">{getAppTitle(language)}</Link>
        <nav className="nav">
          <NavLink to="/vocab" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Từ vựng</NavLink>
          <NavLink to="/grammar" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Ngữ pháp</NavLink>
          <NavLink to="/notes" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Note</NavLink>
          <NavLink to="/sentences" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Câu</NavLink>
        </nav>
      </header>
      <main className="main">
        <Outlet />
      </main>
      <footer className="footer">© {new Date().getFullYear()} {language === 'ja' ? 'Japanese Study' : 'Korean Study'}</footer>
    </div>
  );
}
