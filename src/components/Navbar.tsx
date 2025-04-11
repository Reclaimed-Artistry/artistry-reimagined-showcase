
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import Logo from './Logo';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <nav className="py-4 border-b border-earth-light bg-background/90 backdrop-blur-sm sticky top-0 z-50">
      <div className="container flex justify-between items-center">
        <Link to="/" className="flex-shrink-0">
          <Logo />
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-8">
          <NavLinks />
        </div>

        {/* Mobile Menu Button */}
        <button 
          onClick={toggleMenu} 
          className="md:hidden text-earth-dark hover:text-earth"
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden py-4 px-4 bg-background border-t border-earth-light animate-fade-in">
          <div className="flex flex-col space-y-4">
            <NavLinks mobile onClick={() => setIsMenuOpen(false)} />
          </div>
        </div>
      )}
    </nav>
  );
};

const NavLinks = ({ mobile = false, onClick }: { mobile?: boolean; onClick?: () => void }) => {
  const linkClass = mobile 
    ? "text-earth-dark hover:text-earth py-2 border-b border-earth-light/50 w-full block" 
    : "text-earth-dark hover:text-earth font-medium";

  return (
    <>
      <Link to="/" className={linkClass} onClick={onClick}>Home</Link>
      <Link to="/gallery" className={linkClass} onClick={onClick}>Gallery</Link>
      <Link to="/services" className={linkClass} onClick={onClick}>Services</Link>
      <Link to="/blog" className={linkClass} onClick={onClick}>Blog</Link>
      <Link to="/about" className={linkClass} onClick={onClick}>About</Link>
      <Link to="/contact" className={linkClass} onClick={onClick}>Contact</Link>
      <Link to="/shop" className={`${linkClass} ${mobile ? '' : 'bg-earth text-white px-4 py-2 rounded-md hover:bg-earth-dark'}`} onClick={onClick}>
        Shop
      </Link>
    </>
  );
};

export default Navbar;
