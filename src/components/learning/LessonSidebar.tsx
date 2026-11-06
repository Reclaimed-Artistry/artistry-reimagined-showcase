import { Check, ChevronDown, FileCheck2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { completedPathLessons, type LearningPath } from '@/data/learning';
import { useLearning } from '@/learning/context';
import { lessonKey } from '@/learning/types';

export function LessonSidebar({ path, currentLesson, projectActive = false }: { path: LearningPath; currentLesson?: string; projectActive?: boolean }) {
  const { state, startPath } = useLearning();
  const completed = completedPathLessons(path, state.completedLessons);
  const contents = <><div className="p-5"><p className="eyebrow">Your path</p><Link to={`/paths/${path.slug}`} className="mt-3 block font-display text-base font-bold leading-snug hover:text-primary">{path.title}</Link><div className="mt-5 mb-2 flex justify-between text-[11px] text-muted-foreground"><span>{completed} of {path.lessons.length} lessons</span><span>{Math.round(completed / path.lessons.length * 100)}%</span></div><div className="progress-track" role="progressbar" aria-label="Lesson progress" aria-valuenow={completed} aria-valuemin={0} aria-valuemax={path.lessons.length}><span style={{ width: `${completed / path.lessons.length * 100}%` }} /></div></div><nav aria-label="Path lessons" className="px-3 pb-4">{path.lessons.map((lesson, index) => {
    const done = state.completedLessons.includes(lessonKey(path.slug, lesson.slug));
    return <Link key={lesson.slug} to={`/paths/${path.slug}/lessons/${lesson.slug}`} onClick={() => startPath(path.slug, lesson.slug)} aria-current={currentLesson === lesson.slug ? 'page' : undefined} className={`sidebar-lesson ${currentLesson === lesson.slug ? 'active' : ''}`}><span className={`sidebar-lesson-number ${done ? 'done' : ''}`}>{done ? <Check size={12} /> : index + 1}</span><span className="flex-1">{lesson.title}<small>{lesson.minutes} min</small></span></Link>;
  })}<Link to={`/paths/${path.slug}/project`} className={`sidebar-lesson mt-2 border-t pt-4 ${projectActive ? 'active' : ''}`} aria-current={projectActive ? 'page' : undefined}><span className="sidebar-lesson-number"><FileCheck2 size={13} /></span><span>Your practical project<small>Apply what you’ve learned</small></span></Link></nav></>;
  return <><aside className="lesson-sidebar hidden lg:block">{contents}</aside><details className="learning-mobile-curriculum lg:hidden"><summary> Your path & lessons <ChevronDown size={17} /></summary>{contents}</details></>;
}
