import { useEffect, useId, useState, type FormEvent } from 'react';
import { BriefcaseBusiness, Check, GraduationCap, Sprout } from 'lucide-react';
import { audiences } from '@/data/learning';
import { useLearning } from '@/learning/context';
import type { AudienceId } from '@/learning/types';
import { Button } from '@/components/ui/button';

const audienceIcons = { beginner: Sprout, student: GraduationCap, professional: BriefcaseBusiness };

export function AudienceChooser() {
  const { state, setAudience } = useLearning();
  const [draft, setDraft] = useState<AudienceId | null>(state.audience);
  const [submitted, setSubmitted] = useState(false);
  const name = useId();
  useEffect(() => setDraft(state.audience), [state.audience]);
  useEffect(() => {
    if (!submitted) return;
    const frame = requestAnimationFrame(() => {
      const recommendation = document.getElementById('your-path');
      recommendation?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
      recommendation?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [submitted, state.audience]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!draft) return;
    setAudience(draft);
    setSubmitted(true);
  }

  return <section className="start-section" id="start" aria-labelledby="start-heading">
    <div className="site-container">
      <div className="centered-heading"><p className="eyebrow">Made for your starting point</p><h2 id="start-heading">Where are you starting from?</h2><p>A little about you. A more useful place to begin.</p></div>
      <form onSubmit={handleSubmit} className="audience-form">
        <fieldset><legend className="sr-only">Choose the category that best describes you</legend><div className="audience-grid">
          {audiences.map((audience) => {
            const Icon = audienceIcons[audience.id];
            const selected = draft === audience.id;
            return <label key={audience.id} className={`audience-option ${selected ? 'selected' : ''}`}>
              <input className="sr-only" type="radio" name={name} value={audience.id} checked={selected} onChange={() => setDraft(audience.id)} />
              <span className="audience-option-top"><Icon size={27} strokeWidth={1.5} aria-hidden="true" /><span className={`radio-indicator ${selected ? 'checked' : ''}`} aria-hidden="true">{selected && <Check size={12} strokeWidth={2.5} />}</span></span>
              <span className="audience-option-label">{audience.label}</span>
              <span className="audience-option-description">{audience.description}</span>
            </label>;
          })}
        </div></fieldset>
        <div className="audience-submit"><Button type="submit" size="lg" disabled={!draft}>Show my recommendation</Button><p>No sign-up needed. Change your mind anytime.</p></div>
      </form>
    </div>
  </section>;
}
