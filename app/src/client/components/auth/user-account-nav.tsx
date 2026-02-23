import { NavLink } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Button } from "../ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

export function UserAccountNav({
  user,
}: {
  user: {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    email: string;
    emailVerified: boolean;
    name: string;
    image?: string | null | undefined;
  };
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className="cursor-pointer">
          {user.image && (
            <AvatarImage
              src={user.image}
              alt={`${user.name}'s profile picture`}
            />
          )}

          <AvatarFallback>
            <span>{user.name.charAt(0)}</span>
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <div className="p-1.5">
          <p className="text-sm">{user.name}</p>
          <p className="text-xs text-muted-foreground">{user.email}</p>
        </div>
        <DropdownMenuSeparator />
        <NavLink to="/auth/sign-out">
          <DropdownMenuItem className="cursor-pointer">
            <span className="text-red-500">Sign out</span>
          </DropdownMenuItem>
        </NavLink>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
