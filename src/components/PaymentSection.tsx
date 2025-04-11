
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';

const PaymentSection = () => {
  const [activeTab, setActiveTab] = useState("international");
  const form = useForm();
  
  const handleSubmit = (data) => {
    console.log('Payment form submitted:', data);
    // In a real implementation, this would connect to payment processors
  };

  return (
    <section className="py-16 bg-white">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="section-title">Payment Options</h2>
          <p className="text-lg text-earth-dark/80 max-w-2xl mx-auto">
            Secure and convenient payment methods for our clients worldwide.
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          <Tabs defaultValue="international" className="w-full" onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="international">International Payments</TabsTrigger>
              <TabsTrigger value="nigeria">Nigerian Payments</TabsTrigger>
            </TabsList>
            
            <TabsContent value="international">
              <Card>
                <CardHeader>
                  <CardTitle>International Payment Options</CardTitle>
                  <CardDescription>
                    Secure payment methods for clients outside Nigeria.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <Button variant="outline" className="h-20 flex flex-col items-center justify-center gap-2">
                      <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect width="24" height="24" rx="4" fill="#0070BA" />
                        <path d="M7.3 11.8H9.25L10.05 8.3H8.15L7.3 11.8ZM10.8 8.3L9.9 11.8H11.8L12.7 8.3H10.8ZM15.7 8.3H13.9L13 11.8H14.85L15.7 8.3Z" fill="white" />
                        <path d="M16.65 8.3L14.95 11.2L14.5 8.7L14.35 8.3H12.7L12.65 8.4L13.65 12.45L13.7 12.7L13.8 12.9H15.1L17.55 8.3H16.65Z" fill="white" />
                      </svg>
                      <span>PayPal</span>
                    </Button>
                    <Button variant="outline" className="h-20 flex flex-col items-center justify-center gap-2">
                      <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect width="24" height="24" rx="4" fill="#6772E5" />
                        <path d="M12.8 11.3C12.8 10.7 13.3 10.2 14 10.2C14.7 10.2 15.1 10.7 15.1 11.2C15.1 11.7 14.8 12.1 14.3 12.2V12.3C14.9 12.4 15.3 12.8 15.3 13.4C15.3 14.1 14.7 14.6 13.9 14.6C13.1 14.6 12.6 14.1 12.5 13.5H13.3C13.4 13.8 13.6 14 13.9 14C14.2 14 14.5 13.8 14.5 13.4C14.5 13 14.2 12.8 13.8 12.8H13.4V12.2H13.8C14.1 12.2 14.3 12 14.3 11.7C14.3 11.4 14.1 11.2 13.9 11.2C13.6 11.2 13.4 11.4 13.4 11.7H12.8V11.3Z" fill="white" />
                        <path d="M11.3 13.8C10.5 13.8 9.9 13.2 9.9 12.4C9.9 11.6 10.5 11 11.3 11C12.1 11 12.7 11.6 12.7 12.4C12.7 13.2 12.1 13.8 11.3 13.8ZM11.3 11.8C11 11.8 10.7 12.1 10.7 12.4C10.7 12.7 11 13 11.3 13C11.6 13 11.9 12.7 11.9 12.4C11.9 12.1 11.6 11.8 11.3 11.8Z" fill="white" />
                        <path d="M8.4 13.7H7.6V11.1H8.4V11.7C8.6 11.3 8.9 11.1 9.3 11.1V11.9C8.9 11.9 8.4 12.1 8.4 12.6V13.7Z" fill="white" />
                      </svg>
                      <span>Credit Card</span>
                    </Button>
                  </div>
                  <div className="mt-4">
                    <Button className="w-full bg-earth text-white">Proceed to Payment</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="nigeria">
              <Card>
                <CardHeader>
                  <CardTitle>Nigerian Bank Payments</CardTitle>
                  <CardDescription>
                    Secure payment methods for clients in Nigeria.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="bank"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Select Bank</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select your bank" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="gtb">Guaranty Trust Bank</SelectItem>
                                <SelectItem value="firstbank">First Bank</SelectItem>
                                <SelectItem value="zenith">Zenith Bank</SelectItem>
                                <SelectItem value="uba">UBA</SelectItem>
                                <SelectItem value="access">Access Bank</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="accountNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Account Number</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter your account number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="amount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Amount (₦)</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="Enter amount" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full bg-earth text-white">
                        Pay Now
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </section>
  );
};

export default PaymentSection;
