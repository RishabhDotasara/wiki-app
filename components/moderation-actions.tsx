"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

export function ApproveButton() {
  const { pending } = useFormStatus();
  
  return (
    <Button 
      type="submit" 
      disabled={pending} 
      className="bg-green-600 hover:bg-green-700 text-white shadow-sm"
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
      ) : (
        <CheckCircle className="h-4 w-4 mr-2" />
      )}
      {pending ? "Merging..." : "Approve & Merge"}
    </Button>
  );
}

export function RejectButton() {
  const { pending } = useFormStatus();
  
  return (
    <Button 
      type="submit" 
      variant="destructive" 
      disabled={pending}
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
      ) : (
        <XCircle className="h-4 w-4 mr-2" />
      )}
      {pending ? "Closing..." : "Close & Discard Request"}
    </Button>
  );
}
