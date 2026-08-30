import { createContext, useContext, useState, ReactNode } from "react";

interface AuthContextType {
  secretKey: string;
  setSecretKey: (key: string) => void;
  isAuthenticated: boolean;
  setIsValidated: (valid: boolean) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [secretKey, setSecretKeyState] = useState(() => {
    return sessionStorage.getItem("etjump-secret-key") || "";
  });
  const [isValidated, setIsValidated] = useState(() => {
    // Check if we have a validated key from this session
    return sessionStorage.getItem("etjump-key-validated") === "true";
  });

  const setSecretKey = (key: string) => {
    setSecretKeyState(key);
    if (key) {
      sessionStorage.setItem("etjump-secret-key", key);
    } else {
      sessionStorage.removeItem("etjump-secret-key");
      sessionStorage.removeItem("etjump-key-validated");
      setIsValidated(false);
    }
  };

  const handleSetIsValidated = (valid: boolean) => {
    setIsValidated(valid);
    if (valid) {
      sessionStorage.setItem("etjump-key-validated", "true");
    } else {
      sessionStorage.removeItem("etjump-key-validated");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        secretKey,
        setSecretKey,
        isAuthenticated: !!secretKey && isValidated,
        setIsValidated: handleSetIsValidated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
