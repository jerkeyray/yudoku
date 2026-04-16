"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Github, LogOut, Star, User } from "lucide-react";
import { Session } from "next-auth";

interface NavbarProps {
  session: Session | null;
}

export function Navbar({ session }: NavbarProps) {
  const isSignedIn = !!session;

  return (
    <div className="fixed w-full z-50 border-b border-white/5 bg-[#0A0A0A]/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex justify-between items-center h-16 px-6">
        <div className="flex items-center">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="font-bold tracking-tight text-lg text-white group-hover:text-indigo-400 transition-colors">
              yudoku
            </span>
          </Link>
        </div>
        <div className="flex items-center">
          <Link
            href="/why-yudoku"
            className="text-sm font-medium text-neutral-300 hover:text-white transition-colors"
          >
            Why Yudoku
          </Link>
        </div>
        <div className="flex items-center gap-x-5">
          <a
            href="https://github.com/jerkeyray/yudoku"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all"
          >
            <Github className="h-5 w-5" />
            <Star className="h-3.5 w-3.5 text-yellow-400" />
          </a>
          {isSignedIn ? (
            <div className="flex items-center gap-x-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-10 w-10 rounded-full hover:bg-white/10"
                  >
                    {session.user?.image ? (
                      <Image
                        src={session.user.image}
                        alt={session.user.name || "Profile"}
                        fill
                        className="object-cover rounded-full"
                        sizes="40px"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold">
                        {session.user?.name?.[0]?.toUpperCase() || "U"}
                      </div>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="bg-[#0F1117] border-white/10 text-slate-200"
                >
                  <DropdownMenuItem
                    asChild
                    className="focus:bg-indigo-500/10 focus:text-indigo-400 cursor-pointer"
                  >
                    <Link href="/home/profile" className="flex items-center">
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="text-red-400 focus:bg-red-500/10 focus:text-red-400 cursor-pointer"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <Button
              asChild
              className="bg-white text-black hover:bg-neutral-200 font-medium rounded-lg px-6 py-2 shadow-lg shadow-white/10"
            >
              <Link href="/sign-in">Sign In</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
