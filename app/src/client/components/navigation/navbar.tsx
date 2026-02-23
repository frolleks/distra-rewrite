import { SignedIn, SignedOut } from "@daveyplate/better-auth-ui";
import { Button } from "../ui/button";
import { NavLink } from "react-router-dom";
import { ThemeToggle } from "../theme/theme-toggle";
import { authClient } from "@/client/lib/auth";
import { UserAccountNav } from "../auth/user-account-nav";

export function Navbar() {
  const { data: session } = authClient.useSession();

  return (
    <div className="sticky top-0 z-99 w-full h-full container mx-auto p-3">
      <div className="flex justify-between items-center">
        <div>
          <p>distra</p>
        </div>
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <SignedIn>
            {session && <UserAccountNav user={session?.user} />}
          </SignedIn>
          <SignedOut>
            <NavLink to="/auth/sign-in">
              <Button className="cursor-pointer">Sign in</Button>
            </NavLink>
          </SignedOut>
        </div>
      </div>
    </div>
  );
}
