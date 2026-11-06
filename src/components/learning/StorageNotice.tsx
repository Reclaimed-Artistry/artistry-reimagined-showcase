import { Info } from 'lucide-react';
import { useLearning } from '@/learning/context';

export function StorageNotice() {
  const { storageAvailable } = useLearning();
  if (storageAvailable) return null;
  return <div role="status" className="storage-warning"><Info size={18} className="shrink-0" /><p>Your browser is blocking local storage. You can still learn, but progress will only last for this visit. Download your project brief and keep notes elsewhere.</p></div>;
}
