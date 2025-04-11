
import React from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Facebook, Twitter, Mail, MapPin, Phone } from 'lucide-react';
import Logo from './Logo';

const Footer = () => {
  return (
    <footer className="bg-earth-dark text-white py-12">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="mb-4">
              <Logo />
            </div>
            <p className="text-earth-light mb-4">
              Creating beautiful, sustainable pieces from reclaimed materials.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-earth-light hover:text-earth-accent transition-colors" aria-label="Instagram">
                <Instagram size={20} />
              </a>
              <a href="#" className="text-earth-light hover:text-earth-accent transition-colors" aria-label="Facebook">
                <Facebook size={20} />
              </a>
              <a href="#" className="text-earth-light hover:text-earth-accent transition-colors" aria-label="Twitter">
                <Twitter size={20} />
              </a>
            </div>
          </div>
          
          <div>
            <h3 className="text-xl font-semibold mb-4 text-earth-accent">Quick Links</h3>
            <ul className="space-y-2">
              <li><Link to="/" className="text-earth-light hover:text-earth-accent transition-colors">Home</Link></li>
              <li><Link to="/gallery" className="text-earth-light hover:text-earth-accent transition-colors">Gallery</Link></li>
              <li><Link to="/services" className="text-earth-light hover:text-earth-accent transition-colors">Services</Link></li>
              <li><Link to="/blog" className="text-earth-light hover:text-earth-accent transition-colors">Blog</Link></li>
              <li><Link to="/about" className="text-earth-light hover:text-earth-accent transition-colors">About</Link></li>
              <li><Link to="/contact" className="text-earth-light hover:text-earth-accent transition-colors">Contact</Link></li>
              <li><Link to="/shop" className="text-earth-light hover:text-earth-accent transition-colors">Shop</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-xl font-semibold mb-4 text-earth-accent">Contact Us</h3>
            <address className="not-italic">
              <div className="flex items-center mb-2">
                <MapPin size={18} className="mr-2 text-earth-accent" />
                <span className="text-earth-light">123 Artisan Way, Craftsville</span>
              </div>
              <div className="flex items-center mb-2">
                <Phone size={18} className="mr-2 text-earth-accent" />
                <span className="text-earth-light">(555) 123-4567</span>
              </div>
              <div className="flex items-center mb-2">
                <Mail size={18} className="mr-2 text-earth-accent" />
                <span className="text-earth-light">hello@reclaimedartistry.com</span>
              </div>
            </address>
          </div>
        </div>
        
        <div className="mt-12 pt-6 border-t border-earth/20 text-center">
          <p className="text-earth-light text-sm">
            &copy; {new Date().getFullYear()} Reclaimed Artistry. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
