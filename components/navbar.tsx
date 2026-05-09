import Link from "next/link";
import { Search, User, Plus, MessageSquarePlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { getCurrentUser } from "@/lib/auth";
import { LoginButton, LogoutButton } from "@/components/auth-buttons";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

export async function Navbar() {
  const user = await getCurrentUser();

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background transition-colors">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg md:text-xl">
          FlightDeck
        </Link>
        <div className="flex flex-1 items-center justify-start ml-2 md:ml-4">
          <Link
            href="/explore"
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors bg-muted/20 px-3 py-1.5 rounded-md border border-muted-foreground/10"
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Compass...</span>
          </Link>
        </div>
        <div className="flex items-center space-x-4">
          {user && (
            <Link
              href="/new-article?edit=true"
              className="flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors mr-2"
              title="Create New Article"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden lg:inline">New Article</span>
            </Link>
          )}

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center gap-2 overflow-hidden max-w-[120px] cursor-pointer hover:bg-muted/50 px-2 py-1.5 rounded-md transition-colors">
                  {user.image ? (
                    <img src={user.image} alt={user.name} className="h-6 w-6 rounded-full" />
                  ) : (
                    <User className="h-5 w-5 text-muted-foreground bg-muted rounded-full p-0.5" />
                  )}
                  <span className="text-sm font-medium truncate hidden sm:inline">{user.name}</span>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/my-articles" className="cursor-pointer w-full">My Articles</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/asks" className="cursor-pointer w-full flex items-center gap-2">
                    {/* <MessageSquarePlus className="h-3.5 w-3.5" /> */}
                    Article Requests
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/queue" className="cursor-pointer w-full">
                    {user.role === "admin" ? "Queue" : "My Requests"}
                  </Link>
                </DropdownMenuItem>
                {/* <DropdownMenuItem asChild>
                  <Link href="/settings" className="cursor-pointer w-full">Developer Settings</Link>
                </DropdownMenuItem> */}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <LogoutButton />
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <LoginButton />
          )}
        </div>
      </div>
    </nav>
  );
}
