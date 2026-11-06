import { Link } from 'react-router-dom';
import { Brand } from './Brand';

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-container">
        <p className="footer-note">Learn it yourself is a free starter edition. Lessons and projects are self-guided; progress is saved on this device.</p>
        <div className="footer-top">
          <div className="footer-brand"><Brand footer /><p>Practical digital skills for the work ahead.</p></div>
          <div className="footer-links"><h3>Learn</h3><Link to="/paths">All paths</Link><Link to="/paths/digital-workplace">Workplace essentials</Link><Link to="/paths/spreadsheets-data">Spreadsheets & data</Link><Link to="/paths/design-content">Design & content</Link><Link to="/paths/web-foundations">Web fundamentals</Link></div>
          <div className="footer-links"><h3>Account</h3><Link to="/dashboard">My learning</Link><Link to="/#start">Find your path</Link><Link to="/privacy">Privacy & data</Link></div>
          <div className="footer-links"><h3>About</h3><Link to="/#how-it-works">How it works</Link><Link to="/#questions">Questions</Link></div>
        </div>
        <div className="footer-bottom"><p>Copyright © {new Date().getFullYear()} Learn it yourself. All rights reserved.</p><Link to="/privacy">Privacy</Link></div>
      </div>
    </footer>
  );
}
