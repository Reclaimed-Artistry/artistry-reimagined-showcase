import { useMemo, useState } from 'react';
import { ChevronRight, Search, SlidersHorizontal, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { audiences, getAudience, getPath, paths } from '@/data/learning';
import { useLearning } from '@/learning/context';
import type { AudienceId } from '@/learning/types';
import { PathCard } from '@/components/learning/PathCard';
import { Button } from '@/components/ui/button';
import { usePageTitle } from '@/hooks/use-page-title';

export default function Paths() {
  usePageTitle('Learning paths');
  const { state, setAudience } = useLearning();
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState('all');
  const audience = getAudience(state.audience);
  const recommended = getPath(audience?.recommendedPath);
  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return paths.filter((path) => (!state.audience || path.audiences.includes(state.audience)) && (level === 'all' || path.level === level) && (!search || `${path.title} ${path.description} ${path.skills.join(' ')}`.toLowerCase().includes(search)))
      .sort((a, b) => Number(b.slug === audience?.recommendedPath) - Number(a.slug === audience?.recommendedPath));
  }, [query, level, state.audience, audience?.recommendedPath]);
  const reset = () => { setQuery(''); setLevel('all'); setAudience(null); };

  return <>
    <section className="catalog-hero"><div className="site-container"><h1>Learning paths.</h1><p>Choose a skill. Build something useful.</p></div></section>
    <section className="site-container pb-20">
      <div className="catalog-filters">
        <fieldset><legend className="filter-label">Show me paths for</legend><div className="mt-3 flex flex-wrap gap-2">{[{ id: null, shortLabel: 'Everyone' }, ...audiences].map((item) => <button key={item.id ?? 'all'} type="button" aria-pressed={state.audience === item.id} className={`filter-chip ${state.audience === item.id ? 'selected' : ''}`} onClick={() => setAudience(item.id as AudienceId | null)}>{item.shortLabel}</button>)}</div></fieldset>
        <p className="mt-3 text-sm text-muted-foreground">Your category guides the recommendation. Every path stays open to you.</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row"><div className="search-field"><Search size={18} aria-hidden="true" /><label htmlFor="path-search" className="sr-only">Search paths or skills</label><input id="path-search" type="search" placeholder="Search paths or skills" value={query} onChange={(event) => setQuery(event.target.value)} />{query && <button type="button" aria-label="Clear search" onClick={() => setQuery('')}><X size={16} /></button>}</div><div className="level-field"><SlidersHorizontal size={16} aria-hidden="true" /><label htmlFor="level-filter" className="sr-only">Filter by experience level</label><select id="level-filter" value={level} onChange={(event) => setLevel(event.target.value)}><option value="all">All levels</option><option value="Beginner">Beginner</option><option value="Building confidence">Building confidence</option></select></div></div>
      </div>
      {audience && recommended && !query && level === 'all' && <div className="catalog-recommendation"><div className="flex-1"><p className="text-[15px] font-semibold">Recommended for {audience.shortLabel.toLowerCase()}</p><p className="mt-1 text-sm text-muted-foreground">{audience.recommendation}</p></div><Link to={`/paths/${recommended.slug}`} className="apple-link shrink-0 text-[15px]">View path <ChevronRight size={14} /></Link></div>}
      <div className="mb-6 mt-8 flex items-center justify-between gap-4"><p className="text-sm text-muted-foreground" role="status">{filtered.length} {filtered.length === 1 ? 'path' : 'paths'}{audience ? ` · ${audience.shortLabel}` : ''}</p>{(query || level !== 'all' || state.audience) && <button className="text-sm text-primary hover:underline" onClick={reset}>Reset filters</button>}</div>
      {filtered.length ? <div className="path-grid">{filtered.map((path) => <PathCard key={path.slug} path={path} recommended={path.slug === audience?.recommendedPath && !query} />)}</div> : <div className="empty-state"><Search size={32} strokeWidth={1.5} /><h2 className="mt-5 text-2xl font-semibold">No paths found.</h2><p className="mt-2 text-sm text-muted-foreground">Try a broader skill, such as “data,” “design,” or “web.”</p><Button variant="outline" className="mt-6" onClick={reset}>Show all paths</Button></div>}
    </section>
  </>;
}
