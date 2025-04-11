
import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Hero from '@/components/Hero';
import FeaturedWorks from '@/components/FeaturedWorks';
import ServicesSection from '@/components/ServicesSection';
import Testimonials from '@/components/Testimonials';
import BlogPreview from '@/components/BlogPreview';
import CtaSection from '@/components/CtaSection';

const Index = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow">
        <Hero />
        <div className="eco-divider"></div>
        <FeaturedWorks />
        <div className="eco-divider"></div>
        <ServicesSection />
        <div className="eco-divider"></div>
        <Testimonials />
        <div className="eco-divider"></div>
        <BlogPreview />
        <div className="eco-divider"></div>
        <CtaSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
