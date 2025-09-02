'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import NotificationsDropdown from './NotificationsDropdown';

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  showNotifications?: boolean;
}

export default function DashboardHeader({ 
  title, 
  subtitle, 
  showNotifications = true 
}: DashboardHeaderProps) {
  const { data: session } = useSession();

  if (!session) return null;

  const getDashboardLink = () => {
    switch (session.user.role) {
      case 'admin':
        return '/admin/dashboard';
      case 'provider':
        return '/provider/dashboard';
      case 'distributor':
        return '/distributor/dashboard';
      case 'client':
        return '/client/dashboard';
      default:
        return '/';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrador';
      case 'provider':
        return 'Proveedor';
      case 'distributor':
        return 'Distribuidor';
      case 'client':
        return 'Cliente';
      default:
        return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'provider':
        return 'bg-blue-100 text-blue-800';
      case 'distributor':
        return 'bg-green-100 text-green-800';
      case 'client':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <header className="bg-white shadow border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Left side - Title and subtitle */}
          <div className="flex items-center space-x-4">
            <Link
              href={getDashboardLink()}
              className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
            >
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">TP</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{title}</h1>
                {subtitle && (
                  <p className="text-sm text-gray-600">{subtitle}</p>
                )}
              </div>
            </Link>
          </div>

          {/* Right side - User info and notifications */}
          <div className="flex items-center space-x-4">
            {/* Analytics Link */}
            <Link
              href="/analytics"
              className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span>Analytics</span>
            </Link>

            {/* Notifications */}
            {showNotifications && (
              <NotificationsDropdown />
            )}

            {/* User menu */}
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-900">
                    {session.user.name}
                  </span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(session.user.role)}`}>
                    {getRoleLabel(session.user.role)}
                  </span>
                </div>
                <p className="text-xs text-gray-500">{session.user.email}</p>
              </div>

              {/* Avatar */}
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">
                  {session.user.name?.charAt(0).toUpperCase()}
                </span>
              </div>

              {/* Logout button */}
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="ml-3 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm transition-colors"
                title="Cerrar Sesión"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
