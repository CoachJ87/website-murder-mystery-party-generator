
import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import ProfileSettings from "@/components/account/ProfileSettings";
import PasswordSettings from "@/components/account/PasswordSettings";
import DeleteAccount from "@/components/account/DeleteAccount";

interface UserMetadata {
  name?: string;
  [key: string]: any;
}

const AccountSettings = () => {
  const { user, signOut } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  
  useEffect(() => {
    if (user) {
      // Properly type cast the user metadata to ensure type safety
      const userData = (user.user_metadata as UserMetadata) || {};
      setName(userData.name || "");
      setEmail(user.email || "");
    }
  }, [user]);

  const handleDeleteAccount = async () => {
    try {
      // The issue is here - let's fix it by removing the type annotation
      // and letting TypeScript infer the types automatically
      const { error } = await supabase.functions.invoke('delete_user_account', {
        body: {}
      });
      
      if (error) throw error;
      
      await signOut();
      toast.success("Your account has been deleted");
    } catch (error: any) {
      console.error("Error deleting account:", error);
      toast.error("Failed to delete account: " + error.message);
      throw error; // Rethrow to be caught by the DeleteAccount component
    }
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <h1 className="text-3xl font-bold mb-8">Account Settings</h1>
          
          <Tabs defaultValue="profile">
            <TabsList className="mb-8 grid w-full grid-cols-2 md:w-auto md:inline-flex">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
            </TabsList>
            
            <TabsContent value="profile">
              <ProfileSettings initialName={name} email={email} />
            </TabsContent>
            
            <TabsContent value="security">
              <div className="space-y-8">
                <PasswordSettings email={email} />
                <DeleteAccount onDeleteAccount={handleDeleteAccount} />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default AccountSettings;
