import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

interface HeadProps {
  title?: string;
  description?: string;
  canonical?: string;
  image?: string;
}

const Head = ({ 
  title = "Murder Mystery Party Generator", 
  description = "Create custom murder mystery parties with our AI-powered generator. Perfect for parties, team building, and events.",
  canonical = "https://murder-mystery.party", 
  image = "https://github.com/CoachJ87/murder-mystery-party-generator/blob/main/public/images/custom_themes.png?raw=true" 
}: HeadProps) => {
  const location = useLocation();
  const [currentUrl, setCurrentUrl] = useState(canonical);
  
  useEffect(() => {
    // Update canonical URL based on current route
    if (location.pathname !== '/') {
      setCurrentUrl(`https://murder-mystery.party${location.pathname}`);
    } else {
      setCurrentUrl(canonical);
    }
  }, [location.pathname, canonical]);
  
  const fullTitle = `${title} | Murder Mystery Party Generator`;
  
  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={currentUrl} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={currentUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      
      {/* Structured data for better SEO */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          "name": "Murder Mystery Party Generator",
          "url": currentUrl,
          "description": description,
          "potentialAction": {
            "@type": "SearchAction",
            "target": "https://murder-mystery.party/search?q={search_term_string}",
            "query-input": "required name=search_term_string"
          }
        })}
      </script>
    </Helmet>
  );
};

export default Head;