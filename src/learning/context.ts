import { createContext, useContext } from 'react';
import type { AudienceId, LearningState, ProjectProgress } from './types';

export interface LearningContextValue {
  state: LearningState;
  storageAvailable: boolean;
  setAudience: (audience: AudienceId | null) => void;
  startPath: (path: string, lesson: string) => void;
  completeLesson: (path: string, lesson: string) => void;
  saveProject: (path: string, project: Omit<ProjectProgress, 'updatedAt'>) => void;
  resetProgress: () => void;
}

export const LearningContext = createContext<LearningContextValue | null>(null);

export function useLearning() {
  const context = useContext(LearningContext);
  if (!context) throw new Error('useLearning must be used inside LearningProvider');
  return context;
}
