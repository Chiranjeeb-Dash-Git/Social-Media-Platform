"use client";

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import toast from "react-hot-toast";
import axios, { AxiosError } from "axios";

interface User {
  id: string;
  username: string;
  email: string;
  image?: string;
  bio?: string;
  karma: number;
  isVerified: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type AuthResponse = {
  token: string;
  user: User;
};

type ApiError = {
  error?: string;
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError<ApiError>(error)) {
    return error.response?.data?.error || fallback;
  }

  return fallback;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    typeof window === "undefined" ? null : localStorage.getItem("token")
  );
  const queryClient = useQueryClient();

  // Set up axios defaults
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      localStorage.setItem("token", token);
    } else {
      delete axios.defaults.headers.common["Authorization"];
      localStorage.removeItem("token");
    }
  }, [token]);

  // Get user profile
  const {
    data: user,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      if (!token) return null;
      const response = await axios.get<User>("/api/users/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    enabled: !!token,
    retry: false,
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const response = await axios.post<AuthResponse>("/api/auth/login", { email, password });
      return response.data;
    },
    onSuccess: (data) => {
      axios.defaults.headers.common["Authorization"] = `Bearer ${data.token}`;
      localStorage.setItem("token", data.token);
      setToken(data.token);
      queryClient.setQueryData(["user"], data.user);
      toast.success(`Welcome back, ${data.user.username}!`);
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "Login failed"));
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async ({
      username,
      email,
      password,
    }: {
      username: string;
      email: string;
      password: string;
    }) => {
      const response = await axios.post<AuthResponse>("/api/auth/register", {
        username,
        email,
        password,
      });
      return response.data;
    },
    onSuccess: (data) => {
      axios.defaults.headers.common["Authorization"] = `Bearer ${data.token}`;
      localStorage.setItem("token", data.token);
      setToken(data.token);
      queryClient.setQueryData(["user"], data.user);
      toast.success(`Welcome to Reddit Clone, ${data.user.username}!`);
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "Registration failed"));
    },
  });

  const login = async (email: string, password: string) => {
    await loginMutation.mutateAsync({ email, password });
  };

  const register = async (username: string, email: string, password: string) => {
    await registerMutation.mutateAsync({ username, email, password });
  };

  const logout = useCallback(() => {
    setToken(null);
    queryClient.setQueryData(["user"], null);
    queryClient.removeQueries(["user"]);
    toast.success("Logged out successfully");
  }, [queryClient]);

  const updateUser = (userData: Partial<User>) => {
    queryClient.setQueryData(["user"], (prev: User | null | undefined) => 
      prev ? { ...prev, ...userData } : null
    );
  };

  // Handle auth errors
  useEffect(() => {
    if (error && (error as AxiosError).response?.status === 401) {
      logout();
    }
  }, [error, logout]);

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        token,
        isLoading,
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
