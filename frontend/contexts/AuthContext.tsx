// frontend/contexts/AuthContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  email?: string;
  full_name?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  studentId: string | null;
  token: string | null;
  setStudentId: (id: string | null) => void;
  setToken: (token: string | null) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [studentId, setStudentIdState] = useState<string | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Derived user object (compatibility)
  const user = studentId ? { id: studentId } : null;

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedId = localStorage.getItem('studentId');

    if (savedToken && savedId) {
      setTokenState(savedToken);
      setStudentIdState(savedId);
    }

    setLoading(false);
  }, []);

  const setStudentId = (id: string | null) => {
    setStudentIdState(id);
    if (id) {
      localStorage.setItem('studentId', id);
    } else {
      localStorage.removeItem('studentId');
    }
  };

  const setToken = (newToken: string | null) => {
    setTokenState(newToken);
    if (newToken) {
      localStorage.setItem('token', newToken);
    } else {
      localStorage.removeItem('token');
    }
  };

  const signOut = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('studentId');
    setTokenState(null);
    setStudentIdState(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        studentId,
        token,
        setStudentId,
        setToken,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
