import { pathMinutes, type LearningPath } from '@/data/learning';

export function downloadText(filename: string, content: string, type = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadBrief(path: LearningPath) {
  const content = [
    'Learn it yourself', path.projectTitle, '', path.projectSummary,
    `Suggested learning time: ${pathMinutes(path)} minutes, plus project time.`,
    '', 'YOUR BRIEF', ...path.projectSteps.map((step, index) => `${index + 1}. ${step}`),
    '', 'WHAT TO CREATE', ...path.deliverables.map((item) => `- ${item}`),
    '', 'SELF-REVIEW CHECKLIST', ...path.rubric.map((item) => `[ ] ${item}`),
    '', 'This is a self-guided practice project, not an assessed qualification.',
    'Keep your finished files in your own portfolio. The website saves only your checklist and reflection on this device.',
  ].join('\n');
  downloadText(`${path.slug}-project-brief.txt`, content);
}
