
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { CheckCircle2, FileText, Users, Calendar } from "lucide-react";

const Index = () => {
  const features = [
    {
      icon: <FileText className="h-8 w-8 text-primary" />,
      title: "Customizable Storylines",
      description: "Choose from dozens of themes or create your own unique murder mystery scenario."
    },
    {
      icon: <Users className="h-8 w-8 text-primary" />,
      title: "Character Profiles",
      description: "Detailed character backgrounds, motivations, and secrets for all participants."
    },
    {
      icon: <Calendar className="h-8 w-8 text-primary" />,
      title: "Easy Setup",
      description: "Everything you need to host a memorable murder mystery event in minutes, not hours."
    }
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        <Hero />
        
        {/* Features Section */}
        <section className="py-20 px-4 bg-muted/30">
          <div className="container mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Everything You Need</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <div key={index} className="bg-card p-6 rounded-xl shadow-sm border">
                  <div className="mb-4">{feature.icon}</div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        
        {/* CTA Section */}
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-4xl bg-primary rounded-2xl p-8 md:p-12 text-white">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div className="mb-6 md:mb-0 md:pr-6">
                <h2 className="text-2xl md:text-3xl font-bold mb-4">Ready to host your party?</h2>
                <p className="text-primary-foreground/90 mb-0">
                  Join thousands of hosts who are creating unforgettable murder mystery experiences.
                </p>
              </div>
              <Button size="lg" variant="secondary" asChild className="whitespace-nowrap">
                <a href="/sign-up">Get Started</a>
              </Button>
            </div>
          </div>
        </section>
        
        {/* Testimonials */}
        <section className="py-20 px-4 bg-muted/30">
          <div className="container mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
              Loved by Party Hosts
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-card rounded-xl p-6 border shadow-sm">
                  <div className="flex items-center space-x-1 mb-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <svg key={star} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-4">
                    {["My friends still talk about our murder mystery night. The characters were so detailed and the plot twists were perfect!",
                      "So easy to set up! I was worried about hosting for 12 people, but the materials made it simple and everyone had a blast.",
                      "Third murder mystery party using this service and they keep getting better. The customization options are amazing."][i-1]}
                  </p>
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center mr-3">
                      <span className="font-medium text-sm">
                        {["JD", "MK", "AS"][i-1]}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">
                        {["Jessica Davis", "Mark Klein", "Amanda Smith"][i-1]}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {["Party Host", "Corporate Event Planner", "Birthday Celebrant"][i-1]}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default Index;
