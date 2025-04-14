
const signIn = async (email: string, password: string) => {
  try {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
    
    if (data.user) {
      toast.success("Signed in successfully!");
      navigate("/dashboard");
    }
  } catch (error: any) {
    // More specific error handling
    if (error.message.includes('Invalid login credentials')) {
      toast.error("The email or password you entered is incorrect. Please try again.");
    } else if (error.message.includes('Email not confirmed')) {
      toast.error("Please confirm your email before logging in. Check your inbox.");
      navigate("/check-email");
    } else {
      toast.error(`Failed to sign in: ${error.message}`);
    }
    console.error("Sign-in error:", error);
    throw error;
  } finally {
    setLoading(false);
  }
};
