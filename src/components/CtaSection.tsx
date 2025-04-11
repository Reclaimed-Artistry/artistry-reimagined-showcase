
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const CtaSection = () => {
  return (
    <section className="py-20 bg-earth bg-opacity-90 text-white">
      <div className="container text-center">
        <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to Transform Your Space?</h2>
        <p className="text-xl mb-10 max-w-2xl mx-auto">
          Whether you're looking for a custom piece, a workshop experience, or ready-made artistry,
          we're here to help you bring sustainable beauty into your home.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/contact">
            <Button className="bg-white text-earth hover:bg-earth-light hover:text-earth-dark">
              Contact Us
            </Button>
          </Link>
          <Link to="/shop">
            <Button variant="outline" className="border-white hover:bg-white hover:text-earth-dark">
              Browse Shop
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default CtaSection;
