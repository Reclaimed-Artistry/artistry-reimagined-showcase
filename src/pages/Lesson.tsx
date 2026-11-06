import { useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Clock3, Lightbulb, PencilLine } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { getPath, type LearningPath, type Lesson } from '@/data/learning';
import { useLearning } from '@/learning/context';
import { LessonSidebar } from '@/components/learning/LessonSidebar';
import { StorageNotice } from '@/components/learning/StorageNotice';
import { Button } from '@/components/ui/button';
import { usePageTitle } from '@/hooks/use-page-title';
import NotFound from './NotFound';

export default function LessonPage() {
  const { slug, lessonSlug } = useParams();
  const path = getPath(slug);
  const lesson = path?.lessons.find((item) => item.slug === lessonSlug);
  if (!path || !lesson) return <NotFound />;
  return <LessonView key={`${path.slug}/${lesson.slug}`} path={path} lesson={lesson} />;
}

function LessonView({ path, lesson }: { path: LearningPath; lesson: Lesson }) {
  usePageTitle(lesson.title);
  const { state, startPath, completeLesson, storageAvailable } = useLearning();
  const navigate = useNavigate();
  const alreadyCompleted = state.completedLessons.includes(`${path.slug}/${lesson.slug}`);
  const [selected, setSelected] = useState<number | null>(alreadyCompleted ? lesson.quiz.answer : null);
  const [checked, setChecked] = useState(alreadyCompleted);
  const correct = checked && selected === lesson.quiz.answer;
  const index = path.lessons.findIndex((item) => item.slug === lesson.slug);
  const next = path.lessons[index + 1];
  useEffect(() => { startPath(path.slug, lesson.slug); }, [path.slug, lesson.slug, startPath]);

  function checkAnswer(event: FormEvent) { event.preventDefault(); if (selected !== null) setChecked(true); }
  function finishLesson() {
    if (!correct) return;
    completeLesson(path.slug, lesson.slug);
    if (!alreadyCompleted) toast.success(storageAvailable ? 'Lesson completed.' : 'Lesson completed for this visit.');
    navigate(next ? `/paths/${path.slug}/lessons/${next.slug}` : `/paths/${path.slug}/project`);
  }

  return <div className="site-container py-7 sm:py-10"><Link to={`/paths/${path.slug}`} className="back-link"><ArrowLeft size={14} />Path overview</Link><StorageNotice /><div className="learning-layout mt-6"><LessonSidebar path={path} currentLesson={lesson.slug} /><article className="lesson-article">
    <header className="lesson-header"><div className="flex flex-wrap items-center gap-3"><span className="eyebrow">Lesson {index + 1} of {path.lessons.length}</span><span className="inline-flex items-center gap-1 text-sm text-muted-foreground"><Clock3 size={13} />{lesson.minutes} min</span>{alreadyCompleted && <span className="ml-auto inline-flex items-center gap-1 text-sm font-medium text-primary"><CheckCircle2 size={14} />Completed</span>}</div><h1 className="mt-4">{lesson.title}</h1><p className="mt-5 text-[19px] leading-8">{lesson.intro}</p></header>
    <div className="lesson-body">{lesson.sections.map((section) => <section key={section.title}><h2>{section.title}</h2><p>{section.body}</p>{section.bullets && <ul>{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>}</section>)}<div className="lesson-example"><h3><Lightbulb size={18} />{lesson.example.title}</h3><p className="whitespace-pre-line">{lesson.example.body}</p></div><div className="lesson-practice"><PencilLine size={21} className="shrink-0" /><div><h3>Try it</h3><p>{lesson.practice}</p></div></div></div>
    <section className="knowledge-check" aria-labelledby="quiz-heading"><p className="eyebrow">Knowledge check</p><form onSubmit={checkAnswer}><fieldset><legend id="quiz-heading" className="mt-3 text-[21px] font-semibold leading-7">{lesson.quiz.question}</legend><div className="mt-5 space-y-2.5">{lesson.quiz.options.map((option, optionIndex) => <label key={option} className={`quiz-option ${selected === optionIndex ? 'selected' : ''} ${checked && selected === optionIndex ? correct ? 'correct' : 'incorrect' : ''}`}><input type="radio" name={`quiz-${lesson.slug}`} className="accent-primary" checked={selected === optionIndex} onChange={() => { setSelected(optionIndex); setChecked(false); }} /><span>{option}</span></label>)}</div></fieldset>{checked && <div className={`quiz-feedback ${correct ? 'correct' : 'incorrect'}`} role="status">{correct ? <CheckCircle2 size={18} className="shrink-0 mt-0.5" /> : <Lightbulb size={18} className="shrink-0 mt-0.5" />}<p><strong>{correct ? 'Correct. ' : 'Not quite. '}</strong>{correct ? lesson.quiz.explanation : 'Review the lesson, then choose another answer.'}</p></div>}<div className="mt-6 flex flex-wrap items-center gap-4">{!correct && <Button type="submit" variant="outline" disabled={selected === null}>Check answer <Check size={16} /></Button>}{correct && <Button type="button" onClick={finishLesson}>{alreadyCompleted ? next ? 'Next lesson' : 'Revisit project' : next ? 'Complete & continue' : 'Complete & start project'}<ArrowRight size={16} /></Button>}<span className="text-sm text-muted-foreground">{correct ? 'Ready for the next step.' : 'Choose an answer.'}</span></div></form></section>
    <div className="mt-8 flex justify-between gap-4 text-sm text-muted-foreground">{index > 0 ? <Link className="inline-flex items-center gap-1 hover:text-primary" to={`/paths/${path.slug}/lessons/${path.lessons[index - 1].slug}`}><ArrowLeft size={14} />Previous lesson</Link> : <span />}<Link to={`/paths/${path.slug}/project`} className="inline-flex items-center gap-1 hover:text-primary">View project <ArrowRight size={14} /></Link></div>
  </article></div></div>;
}
