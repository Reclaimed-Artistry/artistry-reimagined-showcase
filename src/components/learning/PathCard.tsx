import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { completedPathLessons, pathMinutes, type LearningPath } from '@/data/learning';
import { useLearning } from '@/learning/context';
import { PathVisual } from './PathVisual';

const cardClasses = { workplace: 'card-workplace', data: 'card-data', design: 'card-design', web: 'card-web' } as const;

export function PathCard({ path, recommended = false }: { path: LearningPath; recommended?: boolean }) {
  const { state } = useLearning();
  const completed = completedPathLessons(path, state.completedLessons);
  const started = state.startedPaths.includes(path.slug);
  return <article className={`path-card ${cardClasses[path.icon]} ${recommended ? 'recommended' : ''}`}>
    <div className="path-card-heading"><p className="eyebrow">{path.category}{recommended && <span className="recommended-label">Recommended for you</span>}</p><h3><Link to={`/paths/${path.slug}`}>{path.title}</Link></h3><p className="path-card-description">{path.description}</p><div className="path-card-links"><Link to={`/paths/${path.slug}`}>Learn more <ChevronRight size={14} /></Link><Link to={`/paths/${path.slug}`}>{started ? 'Continue' : 'Get started'} <ChevronRight size={14} /></Link></div></div>
    <PathVisual path={path} />
    <div className="path-card-meta"><span>{path.level}</span><span>{path.lessons.length} lessons · ~{pathMinutes(path)} min</span><span>Free</span></div>
    {started && <div className="path-card-progress"><div className="progress-track" role="progressbar" aria-label={`${path.title} lesson progress`} aria-valuenow={completed} aria-valuemin={0} aria-valuemax={path.lessons.length}><span style={{ width: `${completed / path.lessons.length * 100}%` }} /></div><span>{completed} of {path.lessons.length} lessons complete</span></div>}
  </article>;
}
