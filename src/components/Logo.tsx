
import React from 'react';

const Logo = () => {
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-10 w-10">
        <svg
          viewBox="0 0 50 50"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-full w-full"
        >
          <circle cx="25" cy="25" r="23" fill="#F5F5DC" stroke="#4D6A4E" strokeWidth="2" />
          <path
            d="M31.5 17C27.5 17 25 20 25 20C25 20 22.5 17 18.5 17C14.5 17 11 20.5 11 24.5C11 30.5 25 38 25 38C25 38 39 30.5 39 24.5C39 20.5 35.5 17 31.5 17Z"
            fill="#4D6A4E"
          />
          <path
            d="M25 26L21 22H29L25 26Z"
            fill="#8B5A2B"
          />
          <path
            d="M25 32V26L29 22V28L25 32Z"
            fill="#B2704E"
          />
          <path
            d="M25 32V26L21 22V28L25 32Z"
            fill="#D2B48C"
          />
        </svg>
      </div>
      <div className="text-xl md:text-2xl font-bold text-earth-dark">
        Reclaimed Artistry
      </div>
    </div>
  );
};

export default Logo;
