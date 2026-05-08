import Link from "next/link";
import { Search, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { getCurrentUser } from "@/lib/auth";
import { LoginButton, LogoutButton } from "@/components/auth-buttons";

export async function Navbar() {
  const user = await getCurrentUser();

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg md:text-xl">
          InstiWiki
        </Link>
        <div className="flex flex-1 items-center justify-start ml-2 md:ml-4">
          <Link 
            href="/explore" 
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors bg-muted/20 px-3 py-1.5 rounded-md border border-muted-foreground/10"
          >
            <Search className="h-4 w-4" />
            <span>Explore tags...</span>
          </Link>
        </div>
        <div className="flex items-center space-x-4">
          {user && (
             <Link href="/queue" className="text-sm font-semibold text-muted-foreground hover:text-primary hidden md:block">
               {user.role === "admin" ? "Moderation Queue" : "My Requests"}
             </Link>
          )}
          {user ? (
             <div className="flex items-center gap-3">
               <div className="flex items-center gap-2 overflow-hidden max-w-[120px] hidden sm:flex">
                 {user.image ? (
                   /* eslint-disable-next-line @next/next/no-img-element */
                   <img src={user.image} alt={user.name} className="h-6 w-6 rounded-full" />
                 ) : (
                   <User className="h-4 w-4 text-muted-foreground" />
                 )}
                 <span className="text-sm font-medium truncate">{user.name}</span>
               </div>
               <LogoutButton />
             </div>
          ) : (
             <LoginButton />
          )}
        </div>
      </div>
    </nav>
  );
}
