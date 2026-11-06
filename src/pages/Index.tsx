import { ArrowUpRight, Check, ChevronRight, Compass, FileCheck2, MousePointer2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AudienceChooser } from '@/components/learning/AudienceChooser';
import { LearningPreview } from '@/components/learning/LearningPreview';
import { PathCard } from '@/components/learning/PathCard';
import { Recommendation } from '@/components/learning/Recommendation';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { paths } from '@/data/learning';
import { usePageTitle } from '@/hooks/use-page-title';

const steps = [
  { icon: Compass, title: 'Choose a path.', text: 'Tell us where you’re starting. Get a suggestion that fits, then explore any skill you like.' },
  { icon: MousePointer2, title: 'Learn by doing.', text: 'Short lessons, practical exercises, and a project that turns knowledge into something useful.' },
  { icon: FileCheck2, title: 'Keep the proof.', text: 'Save your progress, reflect on your work, and keep finished projects for your portfolio.' },
];

export default function Index() {
  usePageTitle('Digital skills for the work ahead');
  return <>
    <section className="home-hero">
      <div className="site-container hero-center">
        <h1>Learn it yourself.</h1>
        <p className="hero-subhead">Digital skills for the work ahead.</p>
        <div className="hero-actions"><Button asChild size="lg"><Link to="/#start">Find your path</Link></Button><Link to="/paths" className="apple-link">Explore all paths <ChevronRight size={15} /></Link></div>
        <p className="hero-note">Free starter edition. No account required.</p>
      </div>
      <div className="site-container hero-stage"><LearningPreview /></div>
    </section>

    <AudienceChooser />
    <Recommendation />

    <section id="how-it-works" className="how-section scroll-mt-20"><div className="site-container">
      <div className="centered-heading"><p className="eyebrow">How it works</p><h2>Built around doing.</h2><p>Less scrolling. More skill.</p></div>
      <div className="how-grid">{steps.map((step) => <div className="how-step" key={step.title}><step.icon size={30} strokeWidth={1.4} aria-hidden="true" /><h3>{step.title}</h3><p>{step.text}</p></div>)}</div>
    </div></section>

    <section className="paths-home-section" id="learning-paths"><div className="site-container">
      <div className="section-heading"><h2>Four paths.<br />Practical skills.</h2><Link to="/paths" className="apple-link">View all paths <ChevronRight size={15} /></Link></div>
      <div className="path-grid">{paths.map((path) => <PathCard key={path.slug} path={path} />)}</div>
    </div></section>

    <section className="project-spotlight"><div className="site-container spotlight-grid">
      <div className="spotlight-copy"><p className="eyebrow">Projects</p><h2>Learn it.<br />Then show it.</h2><p>Every path ends with something you can keep: a dashboard, a campaign, a workspace, or a website. Work that makes your learning tangible.</p><Button asChild><Link to="/paths/spreadsheets-data/project">Explore a project <ArrowUpRight size={15} /></Link></Button></div>
      <div className="project-mock" role="img" aria-label="Illustration of a completed practice project checklist"><div className="project-mock-top"><span>PROJECT</span><span className="project-mock-status"><Check size={12} />Self-review</span></div><h3>Sales dashboard</h3><p>Spreadsheets & Data Fundamentals</p><ul><li><Check size={14} />Clean the data</li><li><Check size={14} />Build the chart</li><li><Check size={14} />Explain the finding</li></ul><div className="project-mock-chart" aria-hidden="true"><i /><i /><i /><i /></div><span className="project-mock-caption">Illustrative project preview</span></div>
    </div></section>

    <section id="questions" className="faq-section scroll-mt-20"><div className="site-container narrow-container">
      <div className="centered-heading"><h2>Questions, answered.</h2></div>
      <Accordion type="single" collapsible className="faq-list">
        <AccordionItem value="experience"><AccordionTrigger>What if I’m completely new?</AccordionTrigger><AccordionContent>Choose “I’m a complete beginner.” We’ll suggest Digital Workplace Essentials first. You only need a browser and a willingness to practise. Some projects also use a spreadsheet, design, or website tool.</AccordionContent></AccordionItem>
        <AccordionItem value="category"><AccordionTrigger>Does my category limit what I can learn?</AccordionTrigger><AccordionContent>No. Your category guides the recommendation. Every path is open to everyone, and changing your starting point does not erase lesson progress.</AccordionContent></AccordionItem>
        <AccordionItem value="free"><AccordionTrigger>Is it free? Is there a certificate?</AccordionTrigger><AccordionContent>All starter lessons and projects are free. There is no checkout or certificate programme yet. Project checklists are self-guided, not professional assessments or a guarantee of employment.</AccordionContent></AccordionItem>
        <AccordionItem value="progress"><AccordionTrigger>Where is my progress saved?</AccordionTrigger><AccordionContent>On this browser and device. No account is required. Progress does not sync between devices and may disappear if you clear browser data. You can download a record from My learning; project files stay in your own care.</AccordionContent></AccordionItem>
      </Accordion>
    </div></section>

    <section className="bottom-cta"><div className="site-container centered-heading"><h2>Start where you are.</h2><p>Use what you learn next.</p><Button asChild size="lg"><Link to="/#start">Find your path</Link></Button></div></section>
  </>;
}
