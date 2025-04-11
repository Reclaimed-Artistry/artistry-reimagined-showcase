
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardTitle, CardDescription } from '@/components/ui/card';

const featuredWorks = [
  {
    id: 1,
    title: "Reclaimed Oak Dining Table",
    description: "Handcrafted dining table made from 100-year-old reclaimed oak barn wood.",
    image: "https://images.unsplash.com/photo-1503602642458-232111445657",
    category: "Furniture"
  },
  {
    id: 2,
    title: "Driftwood Wall Art",
    description: "Unique wall sculpture created from beach-collected driftwood pieces.",
    image: "https://images.unsplash.com/photo-1525974160448-038dacadcc71",
    category: "Wall Art"
  },
  {
    id: 3,
    title: "Industrial Coffee Table",
    description: "Coffee table made from reclaimed factory floor wood and salvaged metal.",
    image: "https://images.unsplash.com/photo-1532372320572-cda25653a58d",
    category: "Furniture"
  },
  {
    id: 4,
    title: "Repurposed Window Frame Mirror",
    description: "Antique window frame transformed into an elegant wall mirror.",
    image: "https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85",
    category: "Home Decor"
  }
];

const FeaturedWorks = () => {
  return (
    <section className="py-16 bg-earth-light/50">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="section-title">Featured Works</h2>
          <p className="text-lg text-earth-dark/80 max-w-2xl mx-auto">
            Each piece tells a story of transformation, breathing new life into materials
            that would otherwise be forgotten.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredWorks.map((work) => (
            <Card key={work.id} className="card-hover border-earth-light overflow-hidden">
              <div className="aspect-square relative overflow-hidden">
                <img
                  src={work.image}
                  alt={work.title}
                  className="object-cover w-full h-full transition-transform hover:scale-105 duration-500"
                />
                <div className="absolute top-3 right-3 bg-earth-dark/80 text-white text-xs px-2 py-1 rounded">
                  {work.category}
                </div>
              </div>
              <CardContent className="p-4">
                <CardTitle className="text-earth-dark text-xl mb-2">{work.title}</CardTitle>
                <CardDescription className="text-earth-dark/70">
                  {work.description}
                </CardDescription>
              </CardContent>
              <CardFooter className="p-4 pt-0">
                <Link to={`/gallery/${work.id}`} className="text-earth hover:text-earth-dark inline-flex items-center text-sm font-medium">
                  View Details
                  <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
        
        <div className="text-center mt-10">
          <Link to="/gallery">
            <Button variant="outline" className="border-earth text-earth hover:bg-earth hover:text-white">
              View All Works
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FeaturedWorks;
