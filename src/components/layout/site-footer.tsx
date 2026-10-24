import { Link } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useLifePath } from "@/state/lifepath-store";

export function ClearDataButton({ variant = "hero-outline" }: { variant?: "hero-outline" | "outline" }) {
  const { clearAll } = useLifePath();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant={variant} size="sm">
          <Trash2 aria-hidden /> Clear My Data
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Clear everything on this device?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes your profile, finances, scenarios, and saved AI results from this browser. Nothing is stored on a
            server, so this cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              clearAll();
              toast.success("Your data was cleared from this device.");
            }}
          >
            Clear My Data
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 bg-navy text-navy-foreground">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3 lg:px-8">
        <div className="space-y-2">
          <div className="text-lg font-bold">
            Pivot<span className="text-primary">Point</span>
          </div>
          <p className="text-sm text-navy-muted">Find the change that changes everything.</p>
        </div>
        <div className="space-y-1 text-sm text-navy-muted">
          <p className="font-medium text-navy-foreground">Built for Hack for Humanity Detroit 2026</p>
          <p>AI powered by Gemma 4</p>
          <p>Open-source civic technology prototype</p>
          <a href="https://github.com/AERIF-Dev/Pivot-Point" target="_blank" rel="noopener noreferrer" className="block text-navy-foreground underline-offset-4 hover:underline">View source on GitHub</a>
          <Link to="/about" className="inline-block pt-2 text-navy-foreground underline-offset-4 hover:underline">
            How it works & privacy
          </Link>
        </div>
        <div className="space-y-3">
          <p className="text-xs leading-relaxed text-navy-muted">
            Educational decision support only — not professional financial, legal, or employment advice. Your data stays in
            this browser; selected details are sent for AI analysis only when you ask.
          </p>
          <ClearDataButton />
        </div>
      </div>
    </footer>
  );
}
