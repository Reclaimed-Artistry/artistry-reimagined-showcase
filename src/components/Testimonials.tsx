
import React from 'react';
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from '@/components/ui/carousel';
import { Card, CardContent } from '@/components/ui/card';

const testimonials = [
  {
    id: 1,
    name: "Emily Johnson",
    role: "Homeowner",
    content: "The dining table Reclaimed Artistry created for us is not just furniture—it's a work of art with history. The craftsmanship is exceptional, and knowing our piece was made from reclaimed materials makes it even more special.",
    image: "https://randomuser.me/api/portraits/women/45.jpg"
  },
  {
    id: 2,
    name: "Michael Stevens",
    role: "Interior Designer",
    content: "I've collaborated with Reclaimed Artistry on multiple projects, and their ability to transform reclaimed materials into stunning, functional pieces never ceases to amaze me. My clients are always thrilled with the results.",
    image: "https://randomuser.me/api/portraits/men/32.jpg"
  },
  {
    id: 3,
    name: "Sarah Williams",
    role: "Café Owner",
    content: "The custom countertops and tables created for our café have received countless compliments from customers. The team was a pleasure to work with from concept to installation.",
    image: "https://randomuser.me/api/portraits/women/67.jpg"
  },
  {
    id: 4,
    name: "David Chen",
    role: "Workshop Participant",
    content: "The upcycling workshop was both educational and fun. I left with a beautiful side table I made myself and a new appreciation for sustainable craftsmanship.",
    image: "https://randomuser.me/api/portraits/men/75.jpg"
  }
];

const Testimonials = () => {
  return (
    <section className="py-16 bg-earth-beige/30">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="section-title">Client Testimonials</h2>
          <p className="text-lg text-earth-dark/80 max-w-2xl mx-auto">
            Hear what our clients have to say about their experiences with Reclaimed Artistry.
          </p>
        </div>
        
        <Carousel
          opts={{
            align: "start",
            loop: true,
          }}
          className="w-full max-w-5xl mx-auto"
        >
          <CarouselContent>
            {testimonials.map((testimonial) => (
              <CarouselItem key={testimonial.id} className="md:basis-1/2 lg:basis-1/2 pl-4">
                <div className="p-1">
                  <Card className="border-earth-light">
                    <CardContent className="p-6">
                      <div className="flex items-center mb-4">
                        <div className="w-12 h-12 rounded-full overflow-hidden mr-4 border-2 border-earth-light">
                          <img 
                            src={testimonial.image} 
                            alt={testimonial.name} 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <h3 className="font-semibold text-earth-dark">{testimonial.name}</h3>
                          <p className="text-sm text-earth-dark/70">{testimonial.role}</p>
                        </div>
                      </div>
                      <div className="mb-4">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M9.59 4.59A2 2 0 1 1 11 8H8a6 6 0 0 0 6 6v2a8 8 0 0 1-8-8V6a1.99 1.99 0 0 1 2-2h1.59zM17.59 4.59A2 2 0 1 1 19 8h-3a6 6 0 0 0 6 6v2a8 8 0 0 1-8-8V6a1.99 1.99 0 0 1 2-2h1.59z" fill="#4D6A4E" fillOpacity="0.3" />
                        </svg>
                      </div>
                      <p className="text-earth-dark/90 italic">{testimonial.content}</p>
                    </CardContent>
                  </Card>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <div className="flex justify-center mt-8 gap-2">
            <CarouselPrevious className="relative inset-0 translate-y-0 left-0" />
            <CarouselNext className="relative inset-0 translate-y-0 right-0" />
          </div>
        </Carousel>
      </div>
    </section>
  );
};

export default Testimonials;
