import { Link } from "@tanstack/react-router";
import { Compass, Menu, PlayCircle } from "lucide-react";
import { useState } from "react";

import { AiStatusBadge } from "@/components/lifepath/ai";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useJourney } from "@/state/journey";

export const NAV_ITEMS = [
  { to: "/profile", label: "My LifePath", stage: 1 },
  { to: "/skills", label: "Skills", stage: 2 },
  { to: "/finances", label: "Finances & Time", stage: 3 },
  { to: "/job-lab", label: "Job Decision Lab", stage: 4 },
  { to: "/one-change", label: "One Change Away", stage: 5 },
  { to: "/about", label: "How it works", stage: undefined },
] as const;

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 font-bold text-foreground" aria-label="LifePath AI home">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy text-navy-foreground">
        <Compass className="h-4.5 w-4.5" aria-hidden />
      </span>
      <span className="text-[17px] tracking-tight">
        LifePath <span className="text-primary">AI</span>
      </span>
    </Link>
  );
}

export function SiteHeader() {
  const journey = useJourney();
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              activeProps={{ className: "bg-primary-soft text-accent-foreground hover:bg-primary-soft" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <AiStatusBadge className="hidden sm:inline-flex" />
          <Button size="sm" onClick={journey.start} className="hidden md:inline-flex">
            <PlayCircle aria-hidden /> Try Sample Journey
          </Button>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button size="icon" variant="ghost" className="lg:hidden" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle>LifePath AI</SheetTitle>
              </SheetHeader>
              <nav aria-label="Mobile" className="mt-4 flex flex-col gap-1 px-4">
                {NAV_ITEMS.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
                    activeProps={{ className: "bg-primary-soft text-accent-foreground" }}
                  >
                    {item.stage ? (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">
                        {item.stage}
                      </span>
                    ) : (
                      <span className="h-6 w-6" />
                    )}
                    {item.label}
                  </Link>
                ))}
                <div className="mt-4 space-y-3 border-t border-border pt-4">
                  <AiStatusBadge />
                  <Button
                    className="w-full"
                    onClick={() => {
                      setOpen(false);
                      journey.start();
                    }}
                  >
                    <PlayCircle aria-hidden /> Try Sample Journey
                  </Button>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
