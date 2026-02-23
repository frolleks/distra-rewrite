import { AuthUIProvider } from "@daveyplate/better-auth-ui";
import { authClient } from "@/client/lib/auth";
import { useNavigate } from "react-router-dom";
import { ThemeProvider } from "./theme-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();

  return (
    <AuthUIProvider authClient={authClient} navigate={navigate}>
      <ThemeProvider>{children}</ThemeProvider>
    </AuthUIProvider>
  );
}
