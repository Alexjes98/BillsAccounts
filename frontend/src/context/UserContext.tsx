import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { User } from "@/api/repository";
import { useApi } from "@/contexts/ApiContext";

interface UserContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const api = useApi();

  const fetchUser = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getUser();
      setUser(response);
    } catch (err: any) {
      // If 401/403 (unauthorized), it just means no user is logged in.
      // This is a valid state, not an error to show the user.
      if (
        err.response &&
        (err.response.status === 401 || err.response.status === 403)
      ) {
        console.log("User is not logged in (Unauthorized)");
        setUser(null);
      } else {
        console.error("Failed to fetch user:", err);
        setError("Failed to load user profile");
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();

    // Listen for auth events
    // We import dynamically to avoid circular dependencies if any,
    // but standard import is usually fine.
    import("aws-amplify/utils").then(({ Hub }) => {
      const listener = (data: any) => {
        switch (data.payload.event) {
          case "signedIn":
            fetchUser();
            break;
          case "signedOut":
            setUser(null);
            break;
        }
      };

      const cancelListener = Hub.listen("auth", listener);
      return () => cancelListener();
    });
  }, [api]);

  return (
    <UserContext.Provider
      value={{ user, loading, error, refreshUser: fetchUser }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
