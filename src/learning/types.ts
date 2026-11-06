export type AudienceId = 'beginner' | 'student' | 'professional';

export interface ProjectProgress {
  checks: number[];
  reflection: string;
  completed: boolean;
  updatedAt: string;
}

export interface LearningState {
  version: 1;
  audience: AudienceId | null;
  startedPaths: string[];
  completedLessons: string[];
  projects: Record<string, ProjectProgress>;
  lastLesson: { path: string; lesson: string } | null;
}

export const STORAGE_KEY = 'learn-it-yourself:v1';

export const emptyLearningState = (): LearningState => ({
  version: 1,
  audience: null,
  startedPaths: [],
  completedLessons: [],
  projects: {},
  lastLesson: null,
});

export const lessonKey = (path: string, lesson: string) => `${path}/${lesson}`;
