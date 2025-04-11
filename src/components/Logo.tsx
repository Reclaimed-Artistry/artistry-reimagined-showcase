
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
            d="M17 15H33C34.1046 15 35 15.8954 35 17V33C35 34.1046 34.1046 35 33 35H17C15.8954 35 15 34.1046 15 33V17C15 15.8954 15.8954 15 17 15Z"
            fill="#4D6A4E"
          />
          <path
            d="M20 23.5C21.6569 23.5 23 22.1569 23 20.5C23 18.8431 21.6569 17.5 20 17.5C18.3431 17.5 17 18.8431 17 20.5C17 22.1569 18.3431 23.5 20 23.5Z"
            fill="#F5F5DC"
          />
          <path
            d="M25 28L20 33H33L29 28L27 30L25 28Z"
            fill="#F5F5DC"
          />
          <path
            d="M35 26L31 22V30H35V26Z"
            fill="#4D6A4E"
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
