import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Footer from "@/components/Footer";
import Head from "@/components/Head";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { FeatureSteps } from "@/components/ui/feature-steps";
import { Faq1 } from "@/components/ui/faq1";
import { HowItWorks } from "@/components/ui/how-it-works";
import { useAuth } from "@/context/AuthContext";
import { HomeDashboard } from "@/components/dashboard/HomeDashboard";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  // Feature Steps data
  const features = [
    { 
      step: 'Step 1', 
      title: 'Customizable Storylines',
      content: 'Create your own unique murder mystery scenario, from classic themes to dreamed up reality.', 
      image: 'https://github.com/CoachJ87/murder-mystery-party-generator/blob/main/public/images/custom_themes.png?raw=true'
    },
    { 
      step: 'Step 2',
      title: 'Character Profiles',
      content: 'Detailed character backgrounds, motivations, and secrets for all participants.',
      image: 'https://github.com/CoachJ87/murder-mystery-party-generator/blob/main/public/images/character_profiles.png?raw=true'
    },
    { 
      step: 'Step 3',
      title: 'Host Guide',
      content: 'Easy-to-follow step-by-step instructions to host a memorable murder mystery event.',
      image: 'https://github.com/CoachJ87/murder-mystery-party-generator/blob/main/public/images/host_guide.png?raw=true'
    },
  ];

  // How It Works steps
  const howItWorksSteps = [
    {
      number: 1,
      title: "Describe ideal murder mystery.",
      description: "Tell us what theme and features you want in your mystery."
    },
    {
      number: 2,
      title: "The Mystery Machine creates your first version instantly.",
      description: "Our AI generates a complete mystery with characters and clues."
    },
    {
      number: 3,
      title: "Talk to the editor to design and perfect your idea.",
      description: "Refine the mystery with the AI assistant until it's perfect."
    },
    {
      number: 4,
      title: "Generate PDF guides for you and your friends",
      description: "Download everything you need to host an amazing party."
    }
  ];

  const handleCreateNew = () => {
    navigate("/mystery/new");
  };

  return (
    <div className="min-h-screen flex flex-col font-inter">
      <Head 
        title="Create Custom Murder Mystery Parties" 
        description="Generate unique murder mystery party scenarios with our AI-powered tool. Customize themes, characters, and plots for unforgettable events."
      />
      <Header />
      
      <main className="flex-1 w-full overflow-x-hidden">
        {/* Hero section is shown for all users */}
        <div className="bg-card">
          <Hero />
        </div>
        
        {isAuthenticated ? (
          // Content for logged-in users
          <div className="w-full px-2 sm:px-4 md:px-6 lg:px-8">
            <HomeDashboard onCreateNew={handleCreateNew} />
          </div>
        ) : (
          // Content for non-logged-in users
          <>
            {/* How It Works Section */}
            <section className="py-6 sm:py-8 px-2 sm:px-4 md:px-6 lg:px-8">
              <div className="w-full max-w-7xl mx-auto">
                <HowItWorks steps={howItWorksSteps} />
              </div>
            </section>
            
            {/* Feature Steps Component */}
            <section className="py-6 sm:py-8 bg-card px-2 sm:px-4 md:px-6 lg:px-8">
              <div className="w-full max-w-7xl mx-auto">
                <FeatureSteps 
                  features={features}
                  title="Everything You Need Included"
                  autoPlayInterval={4000}
                  imageHeight="h-[300px] sm:h-[400px] lg:h-[500px]"
                />
              </div>
            </section>
            
            {/* Testimonials */}
            <section className="py-12 sm:py-16 lg:py-20 px-2 sm:px-4 md:px-6 lg:px-8">
              <div className="w-full max-w-7xl mx-auto">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-8 sm:mb-12 text-black font-playfair">
                  What Others Are Saying
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-[#1D2B35] text-white rounded-xl p-4 sm:p-6 shadow-sm">
                      <div className="flex items-center space-x-1 mb-4">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <svg key={star} className="w-4 h-4 sm:w-5 sm:h-5 text-[#E6A73E]" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                      <p className="text-gray-300 mb-4 text-sm sm:text-base font-inter">
                        {["My friends still talk about our murder mystery night. The characters were so detailed and the plot twists were perfect!",
                          "So easy to set up! I was worried about hosting for 12 people, but the materials made it simple and everyone had a blast.",
                          "Third murder mystery party using this service and they keep getting better. The customization options are amazing."][i-1]}
                      </p>
                      <div className="flex items-center">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#E6A73E] flex items-center justify-center mr-3">
                          <span className="font-medium text-xs sm:text-sm text-[#1D2B35] font-inter">
                            {["JD", "MK", "AS"][i-1]}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-sm sm:text-base font-inter">
                            {["Jessica Davis", "Mark Klein", "Amanda Smith"][i-1]}
                          </p>
                          <p className="text-xs sm:text-sm text-gray-400 font-inter">
                            {["Party Host", "Corporate Event Planner", "Birthday Celebrant"][i-1]}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
            
            {/* FAQ Section */}
            <section className="py-6 sm:py-8 bg-card px-2 sm:px-4 md:px-6 lg:px-8">
              <div className="w-full max-w-7xl mx-auto">
                <Faq1 />
              </div>
            </section>
            
            {/* Support Link Section */}
            <section className="py-8 sm:py-12 px-2 sm:px-4 md:px-6 lg:px-8">
              <div className="w-full max-w-7xl mx-auto text-center">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 text-black font-playfair">Need More Help?</h2>
                <p className="text-muted-foreground mb-6 max-w-2xl mx-auto text-sm sm:text-base font-inter">
                  Visit our comprehensive support center for FAQs, hosting tips, and more information about using our Murder Mystery Generator.
                </p>
                <Button asChild size="lg" className="bg-[#E6A73E] text-[#1D2B35] hover:bg-[#C26E3E] hover:text-white no-underline h-12 px-6 text-base font-inter">
                  <Link to="/support" className="no-underline">Visit Support Center</Link>
                </Button>
              </div>
            </section>
          </>
        )}
      </main>
      
      <Footer />
    </div>
  );
};

export default Index;