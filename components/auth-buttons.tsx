"use client";

import { signIn, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function LoginButton() {
  return (
    <Button variant="outline" size="sm" onClick={() => signIn("github")}>
      Sign In
    </Button>
  );
}

export function LogoutButton() {
  return (
    <Button variant="ghost" size="sm" onClick={() => signOut()}>
      Logout
    </Button>
  );
}
