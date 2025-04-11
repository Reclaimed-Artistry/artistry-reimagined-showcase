
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const NotFound = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow flex items-center justify-center py-20">
        <div className="container text-center">
          <h1 className="text-7xl font-bold text-earth-dark mb-4">404</h1>
          <h2 className="text-3xl font-semibold text-earth-dark mb-6">Page Not Found</h2>
          <p className="text-lg text-earth-dark/70 mb-8 max-w-md mx-auto">
            The page you are looking for might have been removed, had its name changed,
            or is temporarily unavailable.
          </p>
          <Link to="/">
            <Button className="bg-earth text-white hover:bg-earth-dark">
              Return Home
            </Button>
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default NotFound;
