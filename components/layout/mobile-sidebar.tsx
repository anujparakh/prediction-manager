'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import {
  LayoutDashboard,
  Briefcase,
  ArrowLeftRight,
  ListChecks,
  Lightbulb,
  Menu,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MobileSidebarProps {
  userFirstName?: string | null;
  userEmail?: string | null;
}

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Portfolio',
    href: '/portfolio',
    icon: Briefcase,
  },
  {
    name: 'Transactions',
    href: '/transactions',
    icon: ArrowLeftRight,
  },
  {
    name: 'Rules',
    href: '/rules',
    icon: ListChecks,
  },
  {
    name: 'Recommendations',
    href: '/recommendations',
    icon: Lightbulb,
  },
];

export function MobileSidebar({ userFirstName, userEmail }: MobileSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      {/* Mobile header with hamburger */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between h-16 px-4 bg-gray-900 border-b border-gray-800">
        <Link href="/dashboard" className="flex items-center space-x-2 hover:opacity-90 transition-opacity">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <LayoutDashboard className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-semibold text-gray-100">
            Stock Manager
          </span>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(!isOpen)}
          className="text-gray-100 hover:text-white hover:bg-gray-800"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </Button>
      </div>

      {/* Mobile sidebar overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/50"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          'lg:hidden fixed inset-y-0 left-0 z-40 w-72 bg-gray-900 border-r border-gray-800 transform transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full pt-16">
          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navigation.map(item => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    'flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all',
                    isActive
                      ? 'bg-gray-800 text-gray-100'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-gray-100 hover:scale-[1.02]'
                  )}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="flex items-center justify-between p-4 border-t border-gray-800">
            <div className="flex items-center space-x-3 min-w-0">
              <UserButton
                afterSignOutUrl="/sign-in"
                appearance={{
                  elements: {
                    avatarBox: 'w-10 h-10',
                  },
                }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-100 truncate">
                  {userFirstName || userEmail}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {userEmail}
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
