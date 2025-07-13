import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  meta_description: string;
  published_at: string;
  reading_time: number;
  status: 'draft' | 'published';
}

export default function BlogIndex() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        
        const { data, error: fetchError } = await supabase
          .from('blog_posts')
          .select('id, slug, title, meta_description, published_at, reading_time, status')
          .eq('status', 'published')
          .order('published_at', { ascending: false });

        if (fetchError) throw fetchError;
        
        // Debug logging
        console.log('All blog posts:', data);
        data?.forEach(post => 
          console.log(`Title: ${post.title}, Slug: ${post.slug}, Reading time: ${post.reading_time}`)
        );
        
        setPosts(data || []);
      } catch (err) {
        console.error('Error fetching blog posts:', err);
        setError('Failed to load blog posts. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col bg-[#FEFCF8]">
        <Header />
        <main className="flex-grow py-12 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center py-12">
              <h1 className="text-3xl font-bold text-[#8B1538] mb-4">Error</h1>
              <p className="text-gray-600 mb-6">{error}</p>
              <Button 
                onClick={() => window.location.reload()}
                className="bg-[#8B1538] hover:bg-[#6d102c] text-white"
              >
                Try Again
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FEFCF8]">
      <Header />
      <main className="flex-grow py-12 px-4">
        <Helmet>
          <title>Blog - Murder Mystery Party Generator</title>
          <meta name="description" content="Read our latest articles and tips for hosting the perfect murder mystery party." />
          <meta property="og:title" content="Blog - Murder Mystery Party Generator" />
          <meta property="og:description" content="Discover tips, tricks, and stories about hosting unforgettable murder mystery parties." />
          <meta property="og:type" content="website" />
        </Helmet>

        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <Button asChild variant="ghost" className="mb-4">
              <Link to="/" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Link>
            </Button>
            <h1 className="text-3xl md:text-4xl font-bold text-[#8B1538] mb-2">Murder Mystery Blog</h1>
            <p className="text-gray-600">Tips, guides, and inspiration for your next mystery party</p>
          </div>

          {loading ? (
            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="bg-white">
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-8 w-32 mt-4" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : posts.length > 0 ? (
            <div className="space-y-6">
              {posts.map((post) => (
                <Card key={post.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-xl">
                      <Link to={`/blog/${post.slug}`} className="hover:text-[#8B1538] transition-colors">
                        {post.title}
                      </Link>
                    </CardTitle>
                    <CardDescription className="flex items-center gap-4 text-sm">
                      <span>{format(new Date(post.published_at), 'MMMM d, yyyy')}</span>
                      <span>•</span>
                      <span>{post.reading_time} min read</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700">{post.meta_description}</p>
                    <Link 
                      to={`/blog/${post.slug}`} 
                      className="inline-block mt-4 text-[#8B1538] hover:underline font-medium"
                    >
                      Read more →
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <h2 className="text-xl text-gray-700">No blog posts found.</h2>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
