"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { DashboardSidebar } from "./DashboardSidebar";
import { Session } from "next-auth";

interface MobileNavProps {
  session: Session | null;
}

export function MobileNav({ session }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-4 left-4 z-50 bg-background text-foreground hover:bg-accent hover:text-primary border border-border"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="p-0 w-[280px] sm:w-[320px] bg-background border-r border-border"
      >
        <SheetHeader className="px-4 py-3 border-b border-border">
          <SheetTitle className="text-xl font-bold text-foreground">
            yudoku
          </SheetTitle>
        </SheetHeader>
        <div className="text-foreground">
          <DashboardSidebar isCollapsed={false} session={session} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
