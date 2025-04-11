
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const Hero = () => {
  return (
    <section className="relative py-20 md:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1482881497185-d4a9ddbe4151')] bg-cover bg-center opacity-15"></div>
      <div className="container relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-earth-dark mb-6 leading-tight">
            Transforming the Forgotten into the Extraordinary
          </h1>
          <p className="text-xl text-earth-dark/80 mb-8">
            Unique, handcrafted furniture and décor made from reclaimed materials,
            each with its own story and character.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/gallery" 
              className="inline-flex items-center justify-center bg-earth hover:bg-earth-dark text-white px-6 py-3 rounded-md font-medium transition-colors"
            >
              View Our Work
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link 
              to="/shop" 
              className="inline-flex items-center justify-center bg-earth-accent hover:bg-earth-clay text-earth-dark px-6 py-3 rounded-md font-medium transition-colors"
            >
              Shop Now
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
