
import React from 'react';
import { Link } from 'react-router-dom';
import { Paintbrush, Camera, Video, Layout, Code, Headphones, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';

const services = [
  {
    title: "Graphics Design",
    description: "Creative visual solutions for your brand identity, marketing materials, and more.",
    icon: <Paintbrush className="h-10 w-10 text-earth" />,
    link: "/services#graphics-design"
  },
  {
    title: "Photography",
    description: "Professional photography services to capture your important moments and showcase your products.",
    icon: <Camera className="h-10 w-10 text-earth" />,
    link: "/services#photography"
  },
  {
    title: "Cinematography",
    description: "High-quality video production for events, promotional content, and storytelling.",
    icon: <Video className="h-10 w-10 text-earth" />,
    link: "/services#cinematography"
  },
  {
    title: "UI/UX Design",
    description: "User-centered design solutions for websites and applications that enhance user experience.",
    icon: <Layout className="h-10 w-10 text-earth" />,
    link: "/services#ui-ux-design"
  },
  {
    title: "Web Development",
    description: "Full stack web development services to bring your digital presence to life.",
    icon: <Code className="h-10 w-10 text-earth" />,
    link: "/services#web-development"
  },
  {
    title: "Audio Editing",
    description: "Professional audio creation and editing for podcasts, music, and multimedia projects.",
    icon: <Headphones className="h-10 w-10 text-earth" />,
    link: "/services#audio-editing"
  },
  {
    title: "Training",
    description: "Comprehensive training programs in all our service areas to help you develop new skills.",
    icon: <GraduationCap className="h-10 w-10 text-earth" />,
    link: "/services#training"
  }
];

const ServicesSection = () => {
  return (
    <section className="py-16">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="section-title">Our Services</h2>
          <p className="text-lg text-earth-dark/80 max-w-2xl mx-auto">
            From creative design to technical development, we offer a range of services
            to bring your vision to life with sustainable, mixed media artistry.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {services.map((service, index) => (
            <div 
              key={index} 
              className="bg-white p-6 rounded-lg shadow-sm border border-earth-light flex flex-col h-full card-hover"
            >
              <div className="mb-4">{service.icon}</div>
              <h3 className="text-xl font-semibold mb-3 text-earth-dark">{service.title}</h3>
              <p className="text-earth-dark/70 mb-4 flex-grow">{service.description}</p>
              <Link to={service.link} className="text-earth hover:text-earth-dark inline-flex items-center text-sm font-medium mt-auto">
                Learn More
                <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </div>
          ))}
        </div>
        
        <div className="text-center mt-10">
          <Link to="/services">
            <Button className="bg-earth text-white hover:bg-earth-dark">
              Explore All Services
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
