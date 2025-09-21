import { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
// Removed i18n for now to fix TypeScript errors
import { ArrowRight, Clock, Users, BookOpen, ChevronRight } from 'lucide-react';
// Import i18n directly to avoid type issues
import i18n from 'i18next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const calculateReadingTime = (content: string): number => {
  const wordsPerMinute = 200;
  const wordCount = content.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
};

interface RelatedPost {
  id: string;
  slug: string;
  title: string;
  reading_time?: number;
  language: string;
  content?: string;
}

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  content: string;
  excerpt: string;
  meta_description: string;
  published_at: string;
  updated_at: string;
  reading_time: number;
  featured_image?: string;
  related_posts?: RelatedPost[];
  status?: string;
  language: string;
  post_date: string;
  theme?: string;
}

const CTA_SECTION = ({ theme = 'light' as 'light' | 'dark' } = {}) => {
  return (
    <div className={`bg-${theme === 'dark' ? 'gray-900' : 'white'} rounded-xl p-8 my-12 shadow-lg text-center`}>
      <h3 className="text-2xl font-bold mb-4 text-[#8B1538]">
        Ready to create your own murder mystery?
      </h3>
      <p className="mb-6 text-gray-600">
        Create a unique and engaging murder mystery party with our easy-to-use tools.
      </p>
      <Button 
        asChild 
        className="bg-[#8B1538] hover:bg-[#6d102c] text-white py-6 px-8 text-lg font-medium transition-colors mx-auto"
      >
        <Link to="/mystery/create">
          Create Your Mystery
          <ArrowRight className="ml-2 h-5 w-5" />
        </Link>
      </Button>
    </div>
  );
};

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewingTime, setViewingTime] = useState(0);
  const [showStickyCTA, setShowStickyCTA] = useState(true);
  const ctaSectionRef = useRef<HTMLDivElement>(null);
  // Get current language directly from i18n
  const currentLanguage = i18n.language.split('-')[0];

  // Track time on page for conversion optimization
  useEffect(() => {
    const timer = setInterval(() => {
      setViewingTime(prev => prev + 5);
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  // Set up Intersection Observer for CTA visibility
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Hide sticky CTA when article CTA is visible
          setShowStickyCTA(!entry.isIntersecting);
        });
      },
      { threshold: 0.1 }
    );

    if (ctaSectionRef.current) {
      observer.observe(ctaSectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Show CTA after 30 seconds or when scrolled to bottom
  useEffect(() => {
    if (viewingTime >= 30) {
      // Track engagement in analytics
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'blog_engagement', {
          'event_category': 'engagement',
          'event_label': `Read for ${viewingTime}s`,
          'value': Math.floor(viewingTime / 10)
        });
      }
    }
  }, [viewingTime]);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        setLoading(true);
        
        // Get all posts with this slug to handle multiple languages
        const { data: allPosts, error: fetchError } = await supabase
          .from('blog_posts')
          .select('*')
          .eq('slug', slug)
          .eq('status', 'published')
          .eq('language', currentLanguage);

        if (fetchError) throw fetchError;
        if (!allPosts || allPosts.length === 0) throw new Error('Post not found');

        // Since we're already filtering by language, just use the first result
        const selectedPost = allPosts[0];

        // Get related posts with the same post_date but different slugs and same language
        const { data: relatedPosts } = await supabase
          .from('blog_posts')
          .select('id, slug, title, reading_time, language, content')
          .eq('post_date', selectedPost.post_date)
          .neq('id', selectedPost.id)
          .eq('status', 'published')
          .eq('language', currentLanguage);

        // Get theme-related posts (excluding the current post and same post_date) in current language
        const { data: themeRelated } = await supabase
          .from('blog_posts')
          .select('id, slug, title, reading_time, language, content')
          .eq('theme', selectedPost.theme)
          .eq('language', currentLanguage)
          .neq('id', selectedPost.id)
          .neq('post_date', selectedPost.post_date) // Exclude same date
          .eq('status', 'published')
          .order('published_at', { ascending: false })
          .limit(3);

        // Get recent posts to fill in if needed
        let related = [...(relatedPosts || [])];
        
        // If we don't have enough related posts, add theme-related ones
        if (related.length < 3 && themeRelated) {
          const uniqueThemeRelated = themeRelated.filter(
            p => !related.some(rp => rp.id === p.id)
          );
          related = [...related, ...uniqueThemeRelated.slice(0, 3 - related.length)];
        }

        // If we still don't have enough, get recent posts in current language
        if (related.length < 3) {
          const { data: recentPosts } = await supabase
            .from('blog_posts')
            .select('id, slug, title, reading_time, language, content')
            .eq('language', currentLanguage)
            .neq('id', selectedPost.id)
            .neq('post_date', selectedPost.post_date) // Exclude same date
            .eq('status', 'published')
            .order('published_at', { ascending: false })
            .limit(3 - related.length);
          
          if (recentPosts) {
            const uniqueRecent = recentPosts.filter(
              p => !related.some(rp => rp.id === p.id)
            );
            related = [...related, ...uniqueRecent];
          }
        }

        const postData = { ...selectedPost, related_posts: related || [] };
        setPost(postData);
        
        // Debug logging
        console.log('Blog post data:', postData);
        console.log('Selected language:', currentLanguage);
      } catch (err) {
        console.error('Error fetching blog post:', err);
        setError('Post not found');
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [slug, currentLanguage]); // Add currentLanguage to dependencies

  if (error) {
    return (
      <div className="min-h-screen bg-[#FEFCF8] py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-6">Related Posts</h2>
          <Link to="/blog" className="text-[#8B1538] hover:underline">
            ← Back to Blog
          </Link>
        </div>
      </div>
    );
  }

  if (loading || !post) {
    return (
      <div className="min-h-screen bg-[#FEFCF8] py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-12 w-3/4 mb-6" />
          <div className="flex items-center space-x-4 mb-8">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-96 w-full mb-8" />
          <div className="space-y-4">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className={`h-4 w-${i % 2 ? 'full' : '5/6'}`} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Generate JSON-LD structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": post.title,
    "description": post.meta_description,
    "datePublished": post.published_at,
    "dateModified": post.updated_at || post.published_at,
    "publisher": {
      "@type": "Organization",
      "name": "Murder Mystery Party Generator",
      "logo": {
        "@type": "ImageObject",
        "url": "https://yourdomain.com/logo.png"
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `https://yourdomain.com/blog/${post.slug}`
    },
    "timeRequired": `PT${post.reading_time || calculateReadingTime(post.content || '')}M`,
    "wordCount": post.content.split(' ').length
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FEFCF8]">
      <Header />
      <main className="flex-grow py-12 px-4">
        <Helmet>
          <title>{post?.title || 'Loading...'} | Mystery Maker</title>
          {post?.meta_description && (
            <meta name="description" content={post.meta_description} />
          )}
          <meta property="og:title" content={post?.title || 'Blog Post'} />
          <meta property="og:description" content={post?.meta_description || ''} />
          <meta property="og:type" content="article" />
          {post?.featured_image && (
            <meta property="og:image" content={post.featured_image} />
          )}
          <script type="application/ld+json">
            {JSON.stringify(jsonLd)}
          </script>
        </Helmet>
        <article className="max-w-4xl mx-auto">
          <header className="mb-12">
            <Link 
              to="/blog" 
              className="inline-flex items-center text-[#8B1538] hover:underline mb-4"
            >
              <ChevronRight className="h-4 w-4 rotate-180 mr-1" />
              Back to Blog
            </Link>
            
            <h1 className="text-4xl md:text-5xl font-bold text-[#8B1538] mb-6">
              {post.title}
            </h1>
            
            <div className="flex flex-wrap items-center text-gray-600 text-sm gap-4 mb-6">
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-1 text-[#8B1538]" />
                {post.reading_time || calculateReadingTime(post.content || '')} min read
              </div>
            </div>
            
            {post.featured_image && (
              <div className="mb-8 rounded-lg overflow-hidden">
                <img 
                  src={post.featured_image} 
                  alt={post.title}
                  className="w-full h-auto object-cover"
                />
              </div>
            )}
          </header>

          <div className="prose prose-lg max-w-none mb-12">
            <div dangerouslySetInnerHTML={{ __html: post.content }} />
          </div>

          <div ref={ctaSectionRef}>
            <CTA_SECTION />
          </div>

          {post.related_posts && post.related_posts.length > 0 && (
            <section className="mt-16">
              <h2 className="text-2xl font-bold text-[#8B1538] mb-6">
                You might also like
              </h2>
              <div className="grid md:grid-cols-3 gap-6">
                {post.related_posts.map((related) => (
                  <Card key={related.id} className="border-[#8B1538] hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <h3 className="font-bold text-lg mb-2 text-[#8B1538]">
                        <Link to={`/blog/${related.slug}`} className="hover:underline">
                          {related.title}
                        </Link>
                      </h3>
                      <div className="flex items-center text-sm text-gray-500 mt-2">
                        <Clock className="h-3 w-3 mr-1" />
                        {related.reading_time || calculateReadingTime(related.content || '')} min read
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

        </article>
      </main>
      
      {/* Bottom CTA for scrollers */}
      {showStickyCTA && (
        <div className="fixed bottom-0 left-0 right-0 bg-white shadow-lg p-4 border-t border-gray-200">
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-center">
            <div className="mb-4 sm:mb-0">
              <h3 className="font-bold text-[#8B1538]">
                Ready to create your own mystery?
              </h3>
              <p className="text-center mb-6 text-gray-600">
                Get started today and create an unforgettable experience for your friends and family.
              </p>
            </div>
            <Button 
              asChild 
              className="bg-[#8B1538] hover:bg-[#6d102c] text-white py-2 px-6 font-medium transition-colors"
            >
              <Link to="/mystery/create">
                Start Now
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      )}
      
      <Footer />
    </div>
  );
}
