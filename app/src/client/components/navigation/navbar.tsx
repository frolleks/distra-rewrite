import { SignedIn, SignedOut } from "@daveyplate/better-auth-ui";
import { Button } from "../ui/button";
import { NavLink } from "react-router-dom";

export function Navbar() {
  return (
    <div className="absolute top-0 left-0 z-99 w-full h-full">
      <div className="container mx-auto p-3 bg-background">
        <div className="flex justify-between items-center">
          <div>
            <p>distra</p>
          </div>
          <div>
            <SignedIn>Hello, user!</SignedIn>
            <SignedOut>
              <NavLink to="/auth/sign-in">
                <Button className="cursor-pointer">Sign in</Button>
              </NavLink>
            </SignedOut>
          </div>
        </div>
      </div>
    </div>
  );
}
