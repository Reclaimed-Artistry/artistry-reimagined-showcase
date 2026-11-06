import { ArrowRight, BookOpen, CheckCircle2, Download, FileCheck2, HardDrive, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { completedPathLessons, getAudience, nextLesson, paths } from '@/data/learning';
import { useLearning } from '@/learning/context';
import { PathIcon } from '@/components/learning/PathVisual';
import { StorageNotice } from '@/components/learning/StorageNotice';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { downloadText } from '@/lib/learning-files';
import { usePageTitle } from '@/hooks/use-page-title';

export default function Dashboard() {
  usePageTitle('My learning');
  const { state, startPath, resetProgress, storageAvailable } = useLearning();
  const audience = getAudience(state.audience);
  const started = paths.filter((path) => state.startedPaths.includes(path.slug));
  const lessonsDone = state.completedLessons.length;
  const projectsDone = Object.values(state.projects).filter((project) => project.completed).length;
  const totalLessons = paths.reduce((total, path) => total + path.lessons.length, 0);
  function exportProgress() {
    downloadText('learn-it-yourself-progress.json', JSON.stringify({ exportedAt: new Date().toISOString(), ...state }, null, 2), 'application/json');
    toast.success('Progress record downloaded.');
  }

  return <div className="site-container py-10 sm:py-14"><StorageNotice /><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><h1 className="page-title">My learning.</h1><p className="mt-4 text-[19px] text-muted-foreground">Your progress, in one place.</p></div><Button asChild variant="outline"><Link to="/paths">Explore paths <ArrowRight size={16} /></Link></Button></div>
    <div className="dashboard-stats"><div><span className="stat-icon"><BookOpen size={21} /></span><p><strong>{started.length}</strong><span>{started.length === 1 ? 'path started' : 'paths started'}</span></p></div><div><span className="stat-icon"><CheckCircle2 size={21} /></span><p><strong>{lessonsDone}<small> / {totalLessons}</small></strong><span>lessons completed</span></p></div><div><span className="stat-icon"><FileCheck2 size={21} /></span><p><strong>{projectsDone}</strong><span>project self-reviews complete</span></p></div></div>
    <div className="dashboard-category"><div><p className="text-[15px] font-semibold">{audience ? `Starting point: ${audience.shortLabel}` : 'Make recommendations yours'}</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{audience ? 'Your recommendation can change as your goals do. All paths remain open.' : 'Choose a category and we’ll suggest a place to start.'}</p></div><Link to="/#start" className="shrink-0 text-sm text-primary hover:underline">{audience ? 'Change category' : 'Choose category'}</Link></div>
    <section className="mt-12"><div className="mb-6 flex items-center justify-between"><h2 className="text-[28px] font-semibold tracking-tight">Keep going</h2><span className="text-sm text-muted-foreground">{started.length} {started.length === 1 ? 'path' : 'paths'}</span></div>{started.length ? <div className="space-y-5">{started.map((path) => {
      const completed = completedPathLessons(path, state.completedLessons);
      const next = nextLesson(path, state.completedLessons);
      const allDone = completed === path.lessons.length;
      const project = state.projects[path.slug];
      const destination = allDone ? `/paths/${path.slug}/project` : `/paths/${path.slug}/lessons/${next.slug}`;
      return <article className="dashboard-path" key={path.slug}><div className="dashboard-path-icon"><PathIcon path={path} size={29} /></div><div className="min-w-0 flex-1"><p className="eyebrow">{path.category}</p><h3 className="mt-2 text-[24px] font-semibold tracking-tight"><Link to={`/paths/${path.slug}`} className="hover:text-primary">{path.title}</Link></h3><div className="mt-4 max-w-md"><div className="mb-2 flex justify-between text-sm text-muted-foreground"><span>{completed} of {path.lessons.length} lessons complete</span><span>{Math.round(completed / path.lessons.length * 100)}%</span></div><div className="progress-track" role="progressbar" aria-label={`${path.title} progress`} aria-valuenow={completed} aria-valuemin={0} aria-valuemax={path.lessons.length}><span style={{ width: `${completed / path.lessons.length * 100}%` }} /></div></div><p className="mt-3 text-sm leading-5 text-muted-foreground">{project?.completed ? 'Project self-review complete.' : allDone ? 'Lessons complete. Your project is waiting.' : `Up next: ${next.title}`}</p><Link to={`/paths/${path.slug}/project`} className="mt-2 inline-block text-sm text-primary hover:underline">{project?.completed ? 'Revisit project' : project ? 'Continue project notes' : 'Open project'}</Link></div><Button asChild className="shrink-0"><Link to={destination} onClick={() => { if (!allDone) startPath(path.slug, next.slug); }}>{allDone ? project?.completed ? 'Revisit project' : 'Work on project' : 'Continue'}<ArrowRight size={16} /></Link></Button></article>;
    })}</div> : <div className="empty-state"><span className="empty-state-icon"><BookOpen size={32} strokeWidth={1.5} /></span><h3 className="mt-5 text-[28px] font-semibold tracking-tight">Start with one skill.</h3><p className="mt-3 max-w-md text-[17px] leading-7 text-muted-foreground">You haven’t started a path yet. Pick a useful skill and take the first step. Your progress will appear here.</p><Button asChild className="mt-6"><Link to={audience ? `/paths/${audience.recommendedPath}` : '/paths'}>{audience ? 'View recommended path' : 'Find a path'}<ArrowRight size={16} /></Link></Button></div>}</section>
    <section className="device-panel mt-10"><HardDrive size={22} className="shrink-0 text-muted-foreground" /><div className="flex-1"><h2 className="text-[17px] font-semibold">{storageAvailable ? 'Progress is saved on this device' : 'Progress is temporary in this browser'}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">No account is needed in this starter edition. Progress doesn’t sync between devices. Clearing browser data may remove it. Keep your project files and download a progress record if useful. The export is a readable record, not a restore file.</p><div className="mt-4 flex flex-wrap gap-5"><button onClick={exportProgress} className="inline-flex items-center gap-2 text-sm font-medium text-primary"><Download size={14} />Download progress record</button><AlertDialog><AlertDialogTrigger asChild><button className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-destructive"><RotateCcw size={13} />Reset learning progress</button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Start with a clean slate?</AlertDialogTitle><AlertDialogDescription>This removes started paths, lesson completions, project checklists, and reflections from this browser. Your selected category stays. Download a progress record first if you want to keep one. This cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep my progress</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { resetProgress(); toast.success('Learning progress reset.'); }}>Reset progress</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div></div></section>
  </div>;
}
