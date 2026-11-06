import { ArrowLeft, Check, CheckCircle2, ChevronRight, Clock3, Download, FileCheck2, Info, Layers2 } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { audiences, completedPathLessons, getPath, nextLesson, pathMinutes } from '@/data/learning';
import { useLearning } from '@/learning/context';
import { lessonKey } from '@/learning/types';
import { PathIcon } from '@/components/learning/PathVisual';
import { StorageNotice } from '@/components/learning/StorageNotice';
import { Button } from '@/components/ui/button';
import { downloadBrief } from '@/lib/learning-files';
import { usePageTitle } from '@/hooks/use-page-title';
import NotFound from './NotFound';

export default function PathDetail() {
  const { slug } = useParams();
  const path = getPath(slug);
  if (!path) return <NotFound />;
  return <PathDetailView path={path} />;
}

function PathDetailView({ path }: { path: NonNullable<ReturnType<typeof getPath>> }) {
  usePageTitle(path.title);
  const { state, startPath } = useLearning();
  const navigate = useNavigate();
  const completed = completedPathLessons(path, state.completedLessons);
  const next = nextLesson(path, state.completedLessons);
  const started = state.startedPaths.includes(path.slug);
  const allDone = completed === path.lessons.length;
  const projectDone = state.projects[path.slug]?.completed;
  function continueLearning() {
    if (allDone) { navigate(`/paths/${path.slug}/project`); return; }
    startPath(path.slug, next.slug);
    navigate(`/paths/${path.slug}/lessons/${next.slug}`);
  }

  return <div className="site-container py-8 sm:py-12">
    <Link to="/paths" className="back-link"><ArrowLeft size={14} />All paths</Link>
    <StorageNotice />
    <div className="path-detail-grid mt-6">
      <div className="min-w-0">
        <section className="path-detail-hero"><div className="flex items-center gap-3"><span className="detail-path-icon"><PathIcon path={path} size={26} /></span><span className="eyebrow">{path.category}</span></div><h1 className="mt-6">{path.title}</h1><p className="mt-4 max-w-2xl text-[19px] leading-7">{path.description}</p><div className="mt-6 flex flex-wrap gap-5 text-sm text-muted-foreground"><span className="inline-flex items-center gap-2"><Layers2 size={15} />{path.lessons.length} lessons + project</span><span className="inline-flex items-center gap-2"><Clock3 size={15} />~{pathMinutes(path)} min</span><span>{path.level}</span></div></section>
        <div className="mt-7 flex flex-wrap items-center gap-4"><Button size="lg" onClick={continueLearning}>{projectDone ? 'Revisit path' : allDone ? 'Go to project' : started ? 'Continue' : 'Start path'}</Button><span className="text-sm text-muted-foreground">Free. No account required.</span></div>
        {started && <p className="mt-4 text-sm text-primary" role="status">{completed} of {path.lessons.length} lessons completed{projectDone ? ' · Project self-review complete' : ''}</p>}
        <section className="mt-12"><h2 className="text-[28px] font-semibold tracking-tight">What you’ll be able to do</h2><ul className="mt-5 space-y-3">{path.outcomes.map((outcome) => <li key={outcome} className="flex items-start gap-3 text-[17px] leading-6"><CheckCircle2 size={18} className="mt-0.5 shrink-0 text-primary" />{outcome}</li>)}</ul></section>
        <section className="mt-12"><div className="mb-5 flex items-end justify-between gap-4"><h2 className="text-[28px] font-semibold tracking-tight">Lessons</h2><span className="text-sm text-muted-foreground">{completed}/{path.lessons.length} complete</span></div><ol className="curriculum-list">{path.lessons.map((lesson, index) => {
          const done = state.completedLessons.includes(lessonKey(path.slug, lesson.slug));
          return <li key={lesson.slug}><Link to={`/paths/${path.slug}/lessons/${lesson.slug}`} onClick={() => startPath(path.slug, lesson.slug)} className="curriculum-item"><span className={`lesson-number ${done ? 'done' : ''}`}>{done ? <Check size={16} /> : index + 1}</span><span className="flex-1"><span className="block text-[17px] font-medium">{lesson.title}</span><span className="mt-1 block text-sm text-muted-foreground">Lesson · Knowledge check · Practice</span></span><span className="hidden sm:block text-sm text-muted-foreground">{lesson.minutes} min</span><ChevronRight size={16} className="text-muted-foreground" /></Link></li>;
        })}<li><Link to={`/paths/${path.slug}/project`} className="curriculum-item project-curriculum"><span className="lesson-number"><FileCheck2 size={18} /></span><span className="flex-1"><span className="block text-[17px] font-medium">{path.projectTitle}</span><span className="mt-1 block text-sm text-muted-foreground">Project · Work at your own pace</span></span><ChevronRight size={16} /></Link></li></ol></section>
        <section className="mt-10"><h2 className="text-[17px] font-semibold">Who it’s for</h2><div className="mt-3 flex flex-wrap gap-2">{audiences.filter((audience) => path.audiences.includes(audience.id)).map((audience) => <span className="skill-tag" key={audience.id}>{audience.shortLabel}</span>)}</div><p className="mt-4 text-sm leading-6 text-muted-foreground">Use any spreadsheet, design, or website tool you have access to. Lessons teach transferable ideas; exact menus differ between tools.</p></section>
      </div>
      <aside className="path-sidebar"><div className="project-sidebar-card"><p className="eyebrow">Project</p><div className="mt-5 mb-4 text-primary"><FileCheck2 size={30} strokeWidth={1.5} /></div><h2 className="text-[24px] font-semibold leading-snug tracking-tight">{path.projectTitle}</h2><p className="mt-3 text-[15px] leading-6 text-muted-foreground">{path.projectSummary}</p><h3 className="mt-6 text-sm font-semibold">What you’ll create</h3><ul className="mt-3 space-y-3">{path.deliverables.map((item) => <li className="flex gap-2 text-sm leading-5 text-muted-foreground" key={item}><Check size={14} className="mt-0.5 shrink-0 text-primary" />{item}</li>)}</ul><Button variant="outline" className="mt-6 w-full" onClick={() => downloadBrief(path)}><Download size={15} />Download brief</Button><Link to={`/paths/${path.slug}/project`} className="mt-4 flex items-center justify-center gap-1 text-sm text-primary">Open project <ChevronRight size={14} /></Link></div><div className="mt-5 flex gap-3 rounded-2xl bg-muted p-5"><Info size={17} className="mt-0.5 shrink-0 text-muted-foreground" /><p className="text-sm leading-6 text-muted-foreground">Free, self-guided starter path. The checklist is a self-review, not an accredited assessment. Keep finished files for your own portfolio.</p></div></aside>
    </div>
  </div>;
}
