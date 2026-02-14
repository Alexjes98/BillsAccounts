import { Authenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import { ReactNode } from "react";

interface RequireAuthProps {
  children: ReactNode;
}

export function RequireAuth({ children }: RequireAuthProps) {
  // If we want to strictly force login for everything inside this wrapper:
  return (
    <Authenticator>
      {() => (
        <div className="h-full w-full">
          {/* 
                We might want to pass user/signOut down or handle it in UserContext.
                For now, just render the children if authenticated.
            */}
          {children}
        </div>
      )}
    </Authenticator>
  );
}
