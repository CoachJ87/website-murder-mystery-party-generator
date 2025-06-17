
import { Helmet } from "react-helmet-async";

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
  
  const fullTitle = `${title} | Murder Mystery Party Generator`;
  
  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={canonical} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={canonical} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Helmet>
  );
};

export default Head;
