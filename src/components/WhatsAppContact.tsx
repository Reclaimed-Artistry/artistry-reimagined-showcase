
import React from 'react';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const WhatsAppContact = () => {
  const phoneNumber = "+2348110767707";
  const message = encodeURIComponent("Hello, I'm interested in your services!");
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;

  return (
    <a 
      href={whatsappUrl} 
      target="_blank" 
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50"
    >
      <Button className="bg-green-500 hover:bg-green-600 text-white rounded-full h-16 w-16 flex items-center justify-center shadow-lg">
        <MessageCircle size={28} />
      </Button>
      <span className="absolute -top-10 right-0 bg-white px-3 py-1 rounded shadow-md text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
        Chat on WhatsApp
      </span>
    </a>
  );
};

export default WhatsAppContact;
