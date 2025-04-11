
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardTitle, CardDescription } from '@/components/ui/card';

const featuredWorks = [
  {
    id: 1,
    title: "Corporate Brand Identity",
    description: "Complete brand identity redesign for a technology startup including logo, website, and marketing materials.",
    image: "https://images.unsplash.com/photo-1558655146-d09347e92766?auto=format&fit=crop&w=800&q=80",
    category: "Graphic Design"
  },
  {
    id: 2,
    title: "Product Photography",
    description: "Professional product photography for an e-commerce tech gadget collection.",
    image: "https://images.unsplash.com/photo-1537434795255-f03bc82f46b5?auto=format&fit=crop&w=800&q=80",
    category: "Photography"
  },
  {
    id: 3,
    title: "Mobile App Development",
    description: "Custom mobile application with intuitive UI/UX design for a health tech company.",
    image: "https://images.unsplash.com/photo-1555774698-0b77e0d5fac6?auto=format&fit=crop&w=800&q=80",
    category: "Web Development"
  },
  {
    id: 4,
    title: "Corporate Event Video",
    description: "Full cinematography and editing for a major tech conference keynote presentation.",
    image: "https://images.unsplash.com/photo-1492724441997-5dc865305da7?auto=format&fit=crop&w=800&q=80",
    category: "Cinematography"
  }
];

const FeaturedWorks = () => {
  return (
    <section className="py-16 bg-earth-light/50">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="section-title">Featured Works</h2>
          <p className="text-lg text-earth-dark/80 max-w-2xl mx-auto">
            Each project showcases our expertise in digital media and ICT solutions, 
            demonstrating our commitment to creativity and technical excellence.
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
