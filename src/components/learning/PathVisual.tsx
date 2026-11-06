import { ChartNoAxesCombined, FolderOpen, Palette, PanelsTopLeft } from 'lucide-react';
import type { LearningPath } from '@/data/learning';

const icons = { workplace: FolderOpen, data: ChartNoAxesCombined, design: Palette, web: PanelsTopLeft };

export function PathIcon({ path, size = 24 }: { path: LearningPath; size?: number }) {
  const Icon = icons[path.icon];
  return <Icon size={size} strokeWidth={1.5} aria-hidden="true" />;
}

export function PathVisual({ path }: { path: LearningPath }) {
  return <div className={`path-visual visual-${path.icon}`} aria-hidden="true">
    {path.icon === 'data' && <div className="mini-spreadsheet"><div className="mini-window-dots"><i /><i /><i /><span>Sales overview</span></div><div className="mini-sheet-body"><div className="mini-sheet-table"><span>Region</span><span>Revenue</span><b>North</b><b>14,300</b><b>South</b><b>17,900</b><b>East</b><b>8,400</b></div><div className="mini-bars"><i /><i /><i /><i /></div></div></div>}
    {path.icon === 'workplace' && <div className="mini-files"><div className="mini-file file-back"><span /><span /><span /></div><div className="mini-folder"><FolderOpen size={66} strokeWidth={1} /><span>Files</span></div><div className="mini-file file-front"><span /><span /><span /></div></div>}
    {path.icon === 'design' && <div className="mini-design"><div className="mini-design-square" /><div className="mini-design-circle" /><div className="mini-design-type">Aa<span>Make it clear.</span></div></div>}
    {path.icon === 'web' && <div className="mini-browser"><div className="mini-window-dots"><i /><i /><i /><span>Your first website</span></div><div className="mini-browser-nav"><span /><i /><i /><i /></div><div className="mini-browser-hero"><span /><span /><i /></div><div className="mini-browser-blocks"><i /><i /><i /></div></div>}
  </div>;
}
