
import React from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

const PaymentSection = () => {
  const handlePaypalPayment = () => {
    // In a real implementation, this would redirect to PayPal checkout
    window.open('https://www.paypal.com', '_blank');
  };

  const handleStripePayment = () => {
    // In a real implementation, this would trigger a Stripe payment modal
    window.open('https://stripe.com', '_blank');
  };

  return (
    <section className="py-16 bg-earth-light">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="section-title">Make a Payment</h2>
          <p className="text-lg text-earth-dark/80 max-w-2xl mx-auto">
            Choose your preferred payment method to complete your transaction securely.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <Card className="card-hover">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl">PayPal</CardTitle>
                <div className="h-10 w-10 bg-blue-500 text-white rounded-full flex items-center justify-center">
                  <DollarSign size={24} />
                </div>
              </div>
              <CardDescription>
                Pay securely using your PayPal account or credit card
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-5 space-y-2 text-earth-dark/80">
                <li>No account required</li>
                <li>Secure checkout</li>
                <li>International payments</li>
                <li>Buyer protection</li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button onClick={handlePaypalPayment} className="w-full bg-blue-500 hover:bg-blue-600">
                Pay with PayPal
              </Button>
            </CardFooter>
          </Card>
          
          <Card className="card-hover">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl">Credit Card</CardTitle>
                <div className="h-10 w-10 bg-purple-500 text-white rounded-full flex items-center justify-center">
                  <CreditCard size={24} />
                </div>
              </div>
              <CardDescription>
                Pay directly using your credit or debit card
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-5 space-y-2 text-earth-dark/80">
                <li>Fast checkout</li>
                <li>256-bit SSL encryption</li>
                <li>Multiple currency support</li>
                <li>Visa, Mastercard, Amex accepted</li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button onClick={handleStripePayment} className="w-full bg-purple-500 hover:bg-purple-600">
                Pay with Card
              </Button>
            </CardFooter>
          </Card>
        </div>
        
        <div className="text-center mt-10">
          <p className="text-sm text-earth-dark/60 mb-4">
            Have questions about payments? 
            <Link to="/contact" className="text-earth ml-1 hover:underline">
              Contact our support team
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
};

export default PaymentSection;
