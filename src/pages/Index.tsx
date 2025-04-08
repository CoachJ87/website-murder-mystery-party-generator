
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { FeatureSteps } from "@/components/ui/feature-steps";
import { Faq1 } from "@/components/ui/faq1";
import { HowItWorks } from "@/components/ui/how-it-works";
import { Separator } from "@/components/ui/separator";

const Index = () => {
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
      image: '/lovable-uploads/cee2d1e1-ca74-4719-b919-16272aa56c02.png'
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

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        <Hero />
        
        <Separator className="my-8 bg-[#1D2B35]" />
        
        {/* How It Works Section */}
        <HowItWorks steps={howItWorksSteps} />
        
        <Separator className="my-8 bg-[#1D2B35]" />
        
        {/* Feature Steps Component */}
        <FeatureSteps 
          features={features}
          title="Everything You Need Included"
          autoPlayInterval={4000}
          imageHeight="h-[500px]"
        />
        
        <Separator className="my-8 bg-[#1D2B35]" />
        
        {/* Testimonials */}
        <section className="py-20 px-4 bg-card">
          <div className="container mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-black">
              Loved by Party Hosts
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-[#1D2B35] text-white rounded-xl p-6 shadow-sm">
                  <div className="flex items-center space-x-1 mb-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <svg key={star} className="w-5 h-5 text-[#E6A73E]" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-gray-300 mb-4">
                    {["My friends still talk about our murder mystery night. The characters were so detailed and the plot twists were perfect!",
                      "So easy to set up! I was worried about hosting for 12 people, but the materials made it simple and everyone had a blast.",
                      "Third murder mystery party using this service and they keep getting better. The customization options are amazing."][i-1]}
                  </p>
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-[#E6A73E] flex items-center justify-center mr-3">
                      <span className="font-medium text-sm text-[#1D2B35]">
                        {["JD", "MK", "AS"][i-1]}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">
                        {["Jessica Davis", "Mark Klein", "Amanda Smith"][i-1]}
                      </p>
                      <p className="text-sm text-gray-400">
                        {["Party Host", "Corporate Event Planner", "Birthday Celebrant"][i-1]}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        
        <Separator className="my-8 bg-[#1D2B35]" />
        
        {/* FAQ Section */}
        <div className="bg-card">
          <Faq1 />
        </div>
        
        <Separator className="my-8 bg-[#1D2B35]" />
        
        {/* Support Link Section */}
        <section className="py-12 px-4">
          <div className="container mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-black">Need More Help?</h2>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Visit our comprehensive support center for FAQs, hosting tips, and more information about using our Murder Mystery Generator.
            </p>
            <Button asChild size="lg" className="bg-[#E6A73E] text-[#1D2B35] hover:bg-[#C26E3E] hover:text-white">
              <Link to="/support" className="no-underline">Visit Support Center</Link>
            </Button>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default Index;
