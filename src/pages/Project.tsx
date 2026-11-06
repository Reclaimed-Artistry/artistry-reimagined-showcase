import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Download, FileSpreadsheet, Info, Save } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { getPath, practiceCsv, type LearningPath } from '@/data/learning';
import { useLearning } from '@/learning/context';
import { LessonSidebar } from '@/components/learning/LessonSidebar';
import { StorageNotice } from '@/components/learning/StorageNotice';
import { Button } from '@/components/ui/button';
import { downloadBrief, downloadText } from '@/lib/learning-files';
import { usePageTitle } from '@/hooks/use-page-title';
import NotFound from './NotFound';

export default function ProjectPage() {
  const { slug } = useParams();
  const path = getPath(slug);
  if (!path) return <NotFound />;
  return <ProjectView key={path.slug} path={path} />;
}

function ProjectView({ path }: { path: LearningPath }) {
  usePageTitle(path.projectTitle);
  const { state, startPath, saveProject, storageAvailable } = useLearning();
  const saved = state.projects[path.slug];
  const [checks, setChecks] = useState<number[]>(saved?.checks ?? []);
  const [reflection, setReflection] = useState(saved?.reflection ?? '');
  const allChecked = checks.length === path.rubric.length;
  const dirty = reflection !== (saved?.reflection ?? '') || [...checks].sort().join(',') !== [...(saved?.checks ?? [])].sort().join(',');
  useEffect(() => { if (!state.startedPaths.includes(path.slug)) startPath(path.slug, path.lessons[0].slug); }, [path.slug, path.lessons, state.startedPaths, startPath]);

  function save(completed: boolean) {
    if (completed && !allChecked) return;
    saveProject(path.slug, { checks, reflection, completed });
    toast.success(storageAvailable ? completed ? 'Project self-review saved.' : 'Draft saved.' : 'Saved for this visit. Browser storage is unavailable.');
  }

  return <div className="site-container py-7 sm:py-10"><Link to={`/paths/${path.slug}`} className="back-link"><ArrowLeft size={14} />Path overview</Link><StorageNotice /><div className="learning-layout mt-6"><LessonSidebar path={path} projectActive /><article className="lesson-article"><header className="lesson-header"><p className="eyebrow">Project</p><h1 className="mt-4">{path.projectTitle}</h1><p className="mt-5 text-[19px] leading-8">{path.projectSummary}</p><div className="mt-6 flex flex-wrap gap-3"><Button variant="outline" size="sm" onClick={() => downloadBrief(path)}><Download size={15} />Download brief</Button>{path.slug === 'spreadsheets-data' && <Button variant="outline" size="sm" onClick={() => downloadText('learn-it-yourself-practice-sales.csv', practiceCsv, 'text/csv;charset=utf-8')}><FileSpreadsheet size={15} />Practice dataset</Button>}</div></header>
      {saved?.completed && <div className="project-complete-banner" role="status"><CheckCircle2 size={22} /><div><strong>Project self-review complete.</strong><p>Keep your finished files for your portfolio. There’s always another useful step.</p></div></div>}
      <div className="lesson-body"><section><h2>The brief</h2><ol className="project-steps">{path.projectSteps.map((step, index) => <li key={step}><span>{index + 1}</span><p>{step}</p></li>)}</ol></section><section><h2>What to create</h2><ul>{path.deliverables.map((item) => <li key={item}>{item}</li>)}</ul></section></div>
      <section className="project-reflection"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-[24px] font-semibold tracking-tight">Check your work</h2><span className="text-sm text-muted-foreground">{checks.length} of {path.rubric.length} checked</span></div><p className="mt-2 text-[15px] leading-6 text-muted-foreground">Use this checklist to reflect on your work.</p><div className="mt-5 space-y-3">{path.rubric.map((item, index) => <label key={item} className="rubric-item"><input type="checkbox" checked={checks.includes(index)} onChange={() => setChecks((previous) => previous.includes(index) ? previous.filter((check) => check !== index) : [...previous, index])} /><span>{item}</span></label>)}</div><div className="mt-7"><label htmlFor="project-reflection" className="text-[17px] font-semibold">What did you learn? <span className="font-normal text-muted-foreground">(optional)</span></label><p id="reflection-help" className="mt-1 mb-3 text-sm leading-5 text-muted-foreground">Capture a challenge, a decision, or what you would improve next time.</p><textarea id="project-reflection" aria-describedby="reflection-help" rows={6} maxLength={5000} value={reflection} onChange={(event) => setReflection(event.target.value)} placeholder="The most useful thing I learned was…" className="reflection-input" /><p className="mt-1 text-right text-xs text-muted-foreground">{reflection.length}/5,000</p></div><div className="mt-5 flex flex-wrap gap-3"><Button variant="outline" onClick={() => save(Boolean(saved?.completed && allChecked))}><Save size={15} />Save draft</Button><Button disabled={!allChecked} onClick={() => save(true)}>{saved?.completed ? 'Update self-review' : 'Save & mark complete'}<CheckCircle2 size={16} /></Button></div><p className="mt-3 text-sm text-muted-foreground" role="status">{dirty ? 'You have unsaved changes.' : saved ? 'Your checklist and reflection are up to date.' : 'Your notes are not saved yet.'}{!allChecked ? ' Check every item to complete your self-review.' : ''}</p></section>
      <div className="mt-6 flex gap-3 rounded-2xl bg-muted p-5"><Info size={17} className="mt-0.5 shrink-0 text-muted-foreground" /><p className="text-sm leading-6 text-muted-foreground">This workspace saves your checklist and reflection on this device, not your project files. Keep finished work in your own folder or portfolio. This is a self-review, not an assessed qualification.</p></div><div className="mt-7 flex flex-wrap justify-between gap-4"><Link to={`/paths/${path.slug}/lessons/${path.lessons[path.lessons.length - 1].slug}`} className="text-link text-sm"><ArrowLeft size={14} />Review last lesson</Link><Link to="/dashboard" className="text-link text-sm">My learning <ArrowRight size={14} /></Link></div>
    </article></div></div>;
}
