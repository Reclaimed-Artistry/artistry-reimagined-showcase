import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { SiteHeader } from './SiteHeader';
import { SiteFooter } from './SiteFooter';

export function SiteLayout() {
  const { pathname, hash, key } = useLocation();
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (hash) {
        let id = hash.slice(1);
        try { id = decodeURIComponent(id); } catch { /* Use the raw fragment if it is malformed. */ }
        document.getElementById(id)?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      } else {
        window.scrollTo({ top: 0, behavior: 'instant' });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname, hash, key]);

  return (
    <div className="site-shell">
      <a href="#main-content" className="skip-link">Skip to content</a>
      <SiteHeader />
      <main id="main-content" className="flex-1" tabIndex={-1}><Outlet /></main>
      <SiteFooter />
    </div>
  );
}
