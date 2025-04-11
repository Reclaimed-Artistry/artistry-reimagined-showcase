
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
          <rect x="15" y="15" width="20" height="20" rx="2" fill="#4D6A4E" />
          <path d="M20 22L30 22" stroke="#F5F5DC" strokeWidth="2" strokeLinecap="round" />
          <path d="M20 26L30 26" stroke="#F5F5DC" strokeWidth="2" strokeLinecap="round" />
          <path d="M20 30L26 30" stroke="#F5F5DC" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      <div className="text-xl md:text-2xl font-bold text-earth-dark">
        Reclaimed Artistry
      </div>
    </div>
  );
};

export default Logo;
