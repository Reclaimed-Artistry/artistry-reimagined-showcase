import { useCallback, useEffect, useState, type ReactNode } from 'react';
import type { LearningContextValue } from '@/learning/context';
import { audiences, paths } from '@/data/learning';
import { LearningContext } from '@/learning/context';
import { emptyLearningState, lessonKey, STORAGE_KEY, type LearningState } from '@/learning/types';

function readState(): LearningState {
  const fallback = emptyLearningState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const value = JSON.parse(raw);
    if (!value || value.version !== 1) return fallback;
    const validPaths = new Set(paths.map((path) => path.slug));
    const validLessons = new Set(paths.flatMap((path) => path.lessons.map((lesson) => lessonKey(path.slug, lesson.slug))));
    const projects: LearningState['projects'] = {};
    if (value.projects && typeof value.projects === 'object') {
      for (const path of paths) {
        const project = value.projects[path.slug];
        if (!project || typeof project !== 'object') continue;
        projects[path.slug] = {
          checks: Array.isArray(project.checks)
            ? [...new Set<number>(project.checks.filter((check: unknown) => Number.isInteger(check) && Number(check) >= 0 && Number(check) < path.rubric.length))]
            : [],
          reflection: typeof project.reflection === 'string' ? project.reflection.slice(0, 5000) : '',
          completed: project.completed === true,
          updatedAt: typeof project.updatedAt === 'string' ? project.updatedAt : new Date().toISOString(),
        };
      }
    }
    const lastPath = paths.find((path) => path.slug === value.lastLesson?.path);
    return {
      version: 1,
      audience: audiences.some((audience) => audience.id === value.audience) ? value.audience : null,
      startedPaths: Array.isArray(value.startedPaths) ? [...new Set<string>(value.startedPaths.filter((slug: unknown) => typeof slug === 'string' && validPaths.has(slug)))] : [],
      completedLessons: Array.isArray(value.completedLessons) ? [...new Set<string>(value.completedLessons.filter((key: unknown) => typeof key === 'string' && validLessons.has(key)))] : [],
      projects,
      lastLesson: lastPath && lastPath.lessons.some((lesson) => lesson.slug === value.lastLesson.lesson)
        ? { path: lastPath.slug, lesson: value.lastLesson.lesson }
        : null,
    };
  } catch {
    return fallback;
  }
}

export function LearningProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LearningState>(readState);
  const [storageAvailable, setStorageAvailable] = useState(true);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      setStorageAvailable(true);
    } catch {
      setStorageAvailable(false);
    }
  }, [state]);

  const setAudience = useCallback<LearningContextValue['setAudience']>((audience) => setState((previous) => ({ ...previous, audience })), []);
  const startPath = useCallback<LearningContextValue['startPath']>((path, lesson) => setState((previous) => ({
    ...previous,
    startedPaths: [...new Set([...previous.startedPaths, path])],
    lastLesson: { path, lesson },
  })), []);
  const completeLesson = useCallback<LearningContextValue['completeLesson']>((path, lesson) => setState((previous) => ({
    ...previous,
    startedPaths: [...new Set([...previous.startedPaths, path])],
    completedLessons: [...new Set([...previous.completedLessons, lessonKey(path, lesson)])],
    lastLesson: { path, lesson },
  })), []);
  const saveProject = useCallback<LearningContextValue['saveProject']>((path, project) => setState((previous) => ({
    ...previous,
    startedPaths: [...new Set([...previous.startedPaths, path])],
    projects: { ...previous.projects, [path]: { ...project, updatedAt: new Date().toISOString() } },
  })), []);
  const resetProgress = useCallback(() => setState((previous) => ({ ...emptyLearningState(), audience: previous.audience })), []);

  return <LearningContext.Provider value={{ state, storageAvailable, setAudience, startPath, completeLesson, saveProject, resetProgress }}>{children}</LearningContext.Provider>;
}
