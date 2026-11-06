import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Brand } from './Brand';

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setOpen(false), [location.pathname, location.hash]);
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [open]);

  return (
    <header className="site-header">
      <div className="site-container header-inner">
        <Brand />
        <nav aria-label="Main navigation" className="hidden md:flex items-center gap-8">
          <NavLink to="/paths" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Paths</NavLink>
          <Link to="/#how-it-works" className="nav-link">How it works</Link>
          <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>My learning</NavLink>
        </nav>
        <div className="flex items-center gap-3">
          <Link to="/#start" className="nav-cta hidden sm:inline-flex">Find your path</Link>
          <button className="icon-button md:hidden" aria-label={open ? 'Close navigation' : 'Open navigation'} aria-expanded={open} aria-controls="mobile-navigation" onClick={() => setOpen(!open)}>{open ? <X size={20} /> : <Menu size={20} />}</button>
        </div>
      </div>
      {open && <nav id="mobile-navigation" aria-label="Mobile navigation" className="mobile-navigation md:hidden">
        <NavLink to="/paths">Paths</NavLink>
        <Link to="/#how-it-works">How it works</Link>
        <NavLink to="/dashboard">My learning</NavLink>
        <Link to="/#start" className="mobile-nav-highlight">Find your path</Link>
      </nav>}
    </header>
  );
}
