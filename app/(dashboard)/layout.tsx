import { ReactNode } from 'react';
import { auth, currentUser } from '@clerk/nextjs/server';
import { UserButton } from '@clerk/nextjs';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Briefcase,
  ArrowLeftRight,
  ListChecks,
  Lightbulb,
} from 'lucide-react';
import { MobileSidebar } from '@/components/layout/mobile-sidebar';

// Force dynamic rendering for all dashboard pages
export const dynamic = 'force-dynamic';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  // Protect the dashboard - redirect to sign-in if not authenticated
  const { userId } = await auth();
  if (!userId) {
    redirect('/sign-in');
  }

  // Get current user info
  const user = await currentUser();

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

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Mobile Sidebar */}
      <MobileSidebar
        userFirstName={user?.firstName}
        userEmail={user?.emailAddresses[0]?.emailAddress}
      />

      {/* Desktop Sidebar - hidden on mobile */}
      <aside className="hidden lg:block fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 border-r border-gray-800">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-gray-800">
            <Link href="/dashboard" className="flex items-center space-x-2 hover:opacity-90 transition-opacity">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <LayoutDashboard className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-semibold text-gray-100">
                Stock Manager
              </span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navigation.map(item => (
              <Link
                key={item.name}
                href={item.href}
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-300 rounded-lg hover:bg-gray-800 hover:text-gray-100 transition-all hover:scale-[1.02]"
              >
                <item.icon className="w-5 h-5 mr-3" />
                {item.name}
              </Link>
            ))}
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
                  {user?.firstName || user?.emailAddresses[0]?.emailAddress}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {user?.emailAddresses[0]?.emailAddress}
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content - responsive padding */}
      <div className="pt-16 lg:pt-0 lg:pl-64">
        <main className="py-8 px-4 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
