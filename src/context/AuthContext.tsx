
import React, { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

type User = {
  id: string;
  name: string;
  email: string;
  avatar?: string;
};

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  isPublic: boolean;
  setIsPublic: (isPublic: boolean) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => void;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock data for demonstration
const MOCK_USERS = [
  {
    id: "1",
    name: "Demo User",
    email: "demo@example.com",
    password: "password123",
    avatar: "https://i.pravatar.cc/150?u=1",
  },
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPublic, setIsPublic] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for existing session in localStorage
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      const foundUser = MOCK_USERS.find(
        (u) => u.email === email && u.password === password
      );
      
      if (!foundUser) {
        throw new Error("Invalid credentials");
      }
      
      const { password: _, ...userWithoutPassword } = foundUser;
      localStorage.setItem("user", JSON.stringify(userWithoutPassword));
      setUser(userWithoutPassword);
      toast.success("Signed in successfully!");
      navigate("/dashboard");
    } catch (error) {
      toast.error("Failed to sign in. Please check your credentials.");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (name: string, email: string, password: string) => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      if (MOCK_USERS.some((u) => u.email === email)) {
        throw new Error("Email already in use");
      }
      
      const newUser = {
        id: Date.now().toString(),
        name,
        email,
        avatar: `https://i.pravatar.cc/150?u=${Date.now()}`,
      };
      
      localStorage.setItem("user", JSON.stringify(newUser));
      setUser(newUser);
      toast.success("Account created successfully!");
      navigate("/dashboard");
    } catch (error) {
      toast.error("Failed to create account. Please try again.");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = () => {
    localStorage.removeItem("user");
    setUser(null);
    toast.info("Signed out");
    navigate("/");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isPublic,
        setIsPublic,
        signIn,
        signUp,
        signOut,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
