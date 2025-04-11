
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardTitle, CardDescription } from '@/components/ui/card';

const blogPosts = [
  {
    id: 1,
    title: "The Beauty of Reclaimed Wood: A Story of Sustainability",
    excerpt: "Discover the environmental benefits and unique character that reclaimed wood brings to furniture design.",
    date: "March 15, 2025",
    image: "https://images.unsplash.com/photo-1523413363574-c40aa1c2ba11",
    category: "Materials"
  },
  {
    id: 2,
    title: "From Factory Floor to Living Room: The Journey of Repurposed Metal",
    excerpt: "Follow the transformation of industrial metal scraps into stunning home décor pieces.",
    date: "February 28, 2025",
    image: "https://images.unsplash.com/photo-1518709766631-a6a7f45921c3",
    category: "Process"
  },
  {
    id: 3,
    title: "Incorporating Sustainable Design into Modern Homes",
    excerpt: "Tips and inspiration for integrating eco-friendly, reclaimed pieces into contemporary interiors.",
    date: "January 20, 2025",
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c",
    category: "Design Tips"
  }
];

const BlogPreview = () => {
  return (
    <section className="py-16">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="section-title">From Our Blog</h2>
          <p className="text-lg text-earth-dark/80 max-w-2xl mx-auto">
            Insights, stories, and inspiration from the world of sustainable craftsmanship.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {blogPosts.map((post) => (
            <Card key={post.id} className="card-hover border-earth-light overflow-hidden">
              <div className="aspect-video relative overflow-hidden">
                <img
                  src={post.image}
                  alt={post.title}
                  className="object-cover w-full h-full transition-transform hover:scale-105 duration-500"
                />
                <div className="absolute top-3 right-3 bg-earth-dark/80 text-white text-xs px-2 py-1 rounded">
                  {post.category}
                </div>
              </div>
              <CardContent className="p-4">
                <div className="text-sm text-earth-dark/60 mb-2">{post.date}</div>
                <CardTitle className="text-earth-dark text-xl mb-2">{post.title}</CardTitle>
                <CardDescription className="text-earth-dark/70">
                  {post.excerpt}
                </CardDescription>
              </CardContent>
              <CardFooter className="p-4 pt-0">
                <Link to={`/blog/${post.id}`} className="text-earth hover:text-earth-dark inline-flex items-center text-sm font-medium">
                  Read More
                  <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
        
        <div className="text-center mt-10">
          <Link to="/blog">
            <Button variant="outline" className="border-earth text-earth hover:bg-earth hover:text-white">
              Read All Articles
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default BlogPreview;
