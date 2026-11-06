import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getAudience, getPath } from '@/data/learning';
import { useLearning } from '@/learning/context';
import { Button } from '@/components/ui/button';
import { PathIcon } from './PathVisual';

export function Recommendation() {
  const { state } = useLearning();
  const audience = getAudience(state.audience);
  const path = getPath(audience?.recommendedPath);
  if (!audience || !path) return null;
  return <section className="recommendation-wrap" aria-labelledby="recommendation-title"><div className="site-container">
    <div className="recommendation-panel" id="your-path" tabIndex={-1}>
      <div className="recommendation-icon"><PathIcon path={path} size={32} /></div>
      <div className="recommendation-copy"><p className="eyebrow">Recommended for you</p><h2 id="recommendation-title">{path.title}</h2><p>{audience.recommendation}</p><span className="recommendation-category">{audience.shortLabel} · All paths are open to you</span></div>
      <Button asChild><Link to={`/paths/${path.slug}`}>View your path <ArrowUpRight size={15} /></Link></Button>
    </div>
    <p className="recommendation-change"><Link to="/#start">Choose a different starting point</Link></p>
  </div></section>;
}
