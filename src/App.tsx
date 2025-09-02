import { Outlet, Link, NavLink } from 'react-router-dom';

export function App() {
  return (
    <div className="container">
      <header className="header">
        <Link to="/" className="brand">Học tiếng Hàn</Link>
        <nav className="nav">
          <NavLink to="/vocab" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Từ vựng</NavLink>
          <NavLink to="/grammar" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Ngữ pháp</NavLink>
          <NavLink to="/notes" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Note</NavLink>
        </nav>
      </header>
      <main className="main">
        <Outlet />
      </main>
      <footer className="footer">© {new Date().getFullYear()} Korean Study</footer>
    </div>
  );
}
