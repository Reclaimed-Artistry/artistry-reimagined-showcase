import { ArrowLeft, Compass } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { usePageTitle } from '@/hooks/use-page-title';

export default function NotFound() {
  usePageTitle('Page not found');
  return <section className="site-container empty-state my-16 sm:my-24"><span className="empty-state-icon"><Compass size={36} strokeWidth={1.5} /></span><p className="eyebrow mt-6">404</p><h1 className="mt-4 text-[40px] sm:text-[56px] font-bold tracking-tight">This page isn’t available.</h1><p className="mt-4 max-w-md text-[17px] leading-7 text-muted-foreground">The link may have changed, or the page may not exist. There’s still plenty to learn from here.</p><Button asChild className="mt-7"><Link to="/paths"><ArrowLeft size={16} />Explore learning paths</Link></Button></section>;
}
