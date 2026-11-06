import { Link } from 'react-router-dom';

export function Brand({ footer = false }: { footer?: boolean }) {
  return (
    <Link to="/" className={`brand ${footer ? 'brand-footer' : ''}`} aria-label="Learn it yourself — home">
      <span className="brand-wordmark">Learn it yourself</span>
    </Link>
  );
}
