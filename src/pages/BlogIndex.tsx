import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ko, es, fr, de, ja, zhCN, nl, da, sv, fi, it, pt } from 'date-fns/locale';

const dateLocales: Record<string, any> = {
  ko,
  es, 
  fr,
  de,
  ja,
  zh: zhCN,
  nl,
  da,
  sv,
  fi,
  it,
  pt
};
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useTranslation } from 'react-i18next';

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  meta_description: string;
  published_at: string;
  post_date: string;
  reading_time?: number;
  status: 'draft' | 'published';
  language: string;
  content?: string;
  theme?: string;
}

const calculateReadingTime = (content: string): number => {
  const wordsPerMinute = 200;
  const wordCount = content.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
};

interface GroupedPost {
  post_date: string;
  posts: BlogPost[];
  primaryPost: BlogPost;
}

export default function BlogIndex() {
  const [groupedPosts, setGroupedPosts] = useState<GroupedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { t, i18n }: any = useTranslation();
  const currentLanguage = i18n.language.split('-')[0];

  useEffect(() => {
    const fetchAndGroupPosts = async () => {
      try {
        setLoading(true);
        
        const { data, error: fetchError } = await supabase
          .from('blog_posts')
          .select('id, slug, title, meta_description, published_at, post_date, reading_time, status, language, theme, content')
          .eq('status', 'published')
          .eq('language', currentLanguage)
          .order('post_date', { ascending: false })
          .order('language', { ascending: true });

        if (fetchError) throw fetchError;
        
        if (!data) {
          setGroupedPosts([]);
          return;
        }

        // Group posts by post_date
        const postsByDate = data.reduce<Record<string, BlogPost[]>>((acc, post) => {
          const date = post.post_date || post.published_at.split('T')[0];
          if (!acc[date]) {
            acc[date] = [];
          }
          acc[date].push(post);
          return acc;
        }, {});

        // Create grouped posts with primary post selection
        const grouped = Object.entries(postsByDate).map(([date, posts]) => {
          // Since we're already filtering by language, just use the first post
          return {
            post_date: date,
            posts,
            primaryPost: posts[0]
          };
        });

        // Sort grouped posts by date (newest first)
        grouped.sort((a, b) => 
          new Date(b.post_date).getTime() - new Date(a.post_date).getTime()
        );

        setGroupedPosts(grouped);
      } catch (err) {
        console.error('Error fetching blog posts:', err);
        setError('Failed to load blog posts. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchAndGroupPosts();
  }, [i18n.language]); // React to language changes


  if (error) {
    return (
      <div className="min-h-screen flex flex-col bg-[#FEFCF8]">
        <Header />
        <main className="flex-grow py-12 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center py-12">
              <h1 className="text-3xl font-bold text-[#8B1538] mb-4">{t('blog.errorTitle')}</h1>
              <p className="text-gray-600 mb-6">{error}</p>
              <Button 
                onClick={() => window.location.reload()}
                className="bg-[#8B1538] hover:bg-[#6d102c] text-white"
              >
                {t('blog.tryAgain')}
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
                {t('blog.backToHome')}
              </Link>
            </Button>
            <h1 className="text-3xl md:text-4xl font-bold text-[#8B1538] mb-2">{t('blog.title')}</h1>
            <p className="text-gray-600">{t('blog.subtitle')}</p>
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
          ) : groupedPosts.length > 0 ? (
            <div className="space-y-8">
              {groupedPosts.map((group) => {
                const formattedDate = format(parseISO(group.post_date), 'MMMM d, yyyy', {
                  locale: dateLocales[currentLanguage] || undefined
                });
                const { primaryPost } = group;
                
                return (
                  <div key={group.post_date} className="space-y-2">
                    <h2 className="text-xl font-semibold text-gray-700">{formattedDate}</h2>
                    <Card className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <CardTitle className="text-xl">
                          <Link to={`/blog/${primaryPost.slug}`} className="hover:text-[#8B1538] transition-colors">
                            {primaryPost.title}
                          </Link>
                        </CardTitle>
                        <CardDescription className="flex items-center gap-4 text-sm">
                          <span>{formattedDate}</span>
                          <span>•</span>
                          <span>{primaryPost.reading_time || calculateReadingTime(primaryPost.content || '')} {t('blog.minRead', { count: primaryPost.reading_time || calculateReadingTime(primaryPost.content || '') })}</span>
                          {group.posts.length > 1 && (
                            <>
                              <span>•</span>
                              <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                                {group.posts.length} {group.posts.length === 1 ? 'post' : 'posts'}
                              </span>
                            </>
                          )}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-700">{primaryPost.meta_description}</p>
                        <div className="flex justify-between items-center mt-4">
                          <Link 
                            to={`/blog/${primaryPost.slug}`} 
                            className="text-[#8B1538] hover:underline font-medium"
                          >
                            {t('blog.readMore')}
                          </Link>
                          
                          {group.posts.length > 1 && (
                            <div className="text-sm text-gray-500">
                              Available in: {group.posts.map(p => p.language.toUpperCase()).join(', ')}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
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
