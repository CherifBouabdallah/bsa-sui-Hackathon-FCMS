"use client";

import * as React from "react";
import { useState } from "react";
import Link from "next/link";
import { ConnectButton, useCurrentAccount } from "@mysten/dapp-kit";
import { Button } from "./ui/button";
import { UserProfileDialog } from "./UserProfileDialog";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "./ui/navigation-menu";

const components: { title: string; href: string; description: string }[] = [
  {
    title: "Campaigns",
    href: "/campaigns",
    description: "Browse and interact with crowdfunding campaigns.",
  },
  {
    title: "Create Campaign",
    href: "/create",
    description: "Launch a new crowdfunding campaign on the blockchain.",
  },
  {
    title: "About",
    href: "/about",
    description: "Learn more about this crowdfunding platform.",
  },
];

interface NavbarProps {
  view?: 'welcome' | 'create' | 'search' | 'receipts' | 'campaign';
  onViewChange?: (view: 'welcome' | 'create' | 'search' | 'receipts' | 'campaign') => void;
  onGoHome?: () => void;
  userName?: string | null;
  onUpdateName?: (name: string) => void;
}

export default function Navbar({ view, onViewChange, onGoHome, userName, onUpdateName }: NavbarProps) {
  const currentAccount = useCurrentAccount();
  const [showProfileDialog, setShowProfileDialog] = useState(false);

  return (
    <div className="sticky top-0 z-50 w-full" style={{ backgroundColor: '#061E37' }}>
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-center h-auto sm:h-16 py-2 sm:py-0 gap-2 sm:gap-4">
          {/* Left side - Brand and Home */}
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={onGoHome}
              className="text-lg font-semibold text-white p-0"
              style={{ color: 'white' }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#963B6B'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'white'}
            >
              👑 <span className="hidden sm:inline ml-1">CrownFunding</span>
            </Button>
          </div>

          {/* Center - App Navigation (only show when logged in) */}
          {currentAccount && onViewChange && (
            <div className="flex flex-wrap justify-center space-x-1 sm:space-x-2">
              <Button
                variant={view === 'create' ? 'default' : 'ghost'}
                onClick={() => onViewChange('create')}
                className={`text-xs sm:text-sm ${
                  view === 'create'
                    ? 'text-white'
                    : 'text-white'
                }`}
                style={view === 'create' ? { backgroundColor: '#963B6B' } : {}}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#963B6B';
                }}
                onMouseLeave={(e) => {
                  if (view === 'create') {
                    e.currentTarget.style.backgroundColor = '#963B6B';
                  } else {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                ✨ <span className="hidden sm:inline ml-1">Create Campaign</span><span className="sm:hidden ml-1">Create</span>
              </Button>
              <Button
                variant={view === 'search' ? 'default' : 'ghost'}
                onClick={() => onViewChange('search')}
                className={`text-xs sm:text-sm ${
                  view === 'search'
                    ? 'text-white'
                    : 'text-white'
                }`}
                style={view === 'search' ? { backgroundColor: '#963B6B' } : {}}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#963B6B';
                }}
                onMouseLeave={(e) => {
                  if (view === 'search') {
                    e.currentTarget.style.backgroundColor = '#963B6B';
                  } else {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                🔍 <span className="hidden sm:inline ml-1">Find Campaign</span><span className="sm:hidden ml-1">Find</span>
              </Button>
              <Button
                variant={view === 'receipts' ? 'default' : 'ghost'}
                onClick={() => onViewChange('receipts')}
                className={`text-xs sm:text-sm ${
                  view === 'receipts'
                    ? 'text-white'
                    : 'text-white'
                }`}
                style={view === 'receipts' ? { backgroundColor: '#963B6B' } : {}}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#963B6B';
                }}
                onMouseLeave={(e) => {
                  if (view === 'receipts') {
                    e.currentTarget.style.backgroundColor = '#963B6B';
                  } else {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                📋 <span className="hidden sm:inline ml-1">My Donations</span><span className="sm:hidden ml-1">Donations</span>
              </Button>
            </div>
          )}

          {/* Right side - User Profile and Wallet Connection */}
          <div className="flex items-center space-x-2">
            {currentAccount && userName && onUpdateName && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowProfileDialog(true)}
                className="text-white hover:bg-purple-600/20"
                title={`Logged in as ${userName}`}
              >
                👤 <span className="hidden sm:inline ml-1">{userName}</span>
              </Button>
            )}
            <ConnectButton />
          </div>

          {/* User Profile Dialog */}
          {userName && onUpdateName && (
            <UserProfileDialog
              isOpen={showProfileDialog}
              currentName={userName}
              onClose={() => setShowProfileDialog(false)}
              onUpdateName={(name) => {
                onUpdateName(name);
                setShowProfileDialog(false);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

const ListItem = React.forwardRef<
  React.ElementRef<"a">,
  React.ComponentPropsWithoutRef<"a">
>(({ className, title, children, ...props }, ref) => {
  return (
    <li>
      <NavigationMenuLink asChild>
        <a
          ref={ref}
          className={`block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-slate-100 hover:text-slate-900 focus:bg-slate-100 focus:text-slate-900 ${className}`}
          {...props}
        >
          <div className="text-sm font-medium leading-none text-gray-900">{title}</div>
          <p className="line-clamp-2 text-sm leading-snug text-slate-600">
            {children}
          </p>
        </a>
      </NavigationMenuLink>
    </li>
  );
});
ListItem.displayName = "ListItem";