"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export function UserMenu() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const t = useTranslations('menu');

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setIsOpen(false);
    await signOut({ callbackUrl: "/auth/signin", redirect: false });
    router.push("/auth/signin");
    router.refresh();
  };

  const handleNavigate = (path: string) => {
    router.push(path);
    setIsOpen(false);
  };

  if (!session) {
    return null;
  }

  const userInitial = session.user?.email?.charAt(0).toUpperCase() || 'U';

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors focus-ring"
        title={session.user?.email || 'User'}
      >
        {userInitial}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-theme-surface rounded-lg shadow-lg border border-theme py-1 z-[9999]">
          <div className="px-4 py-2 border-b border-theme-subtle">
            <p className="text-sm font-medium text-theme-primary truncate">
              {session.user?.email}
            </p>
          </div>

          <button
            onClick={() => handleNavigate('/profile')}
            className="w-full text-left px-4 py-2 text-sm text-theme-primary hover:bg-theme-surface/80 transition-colors"
          >
            {t('profile')}
          </button>

          <button
            onClick={() => handleNavigate('/settings')}
            className="w-full text-left px-4 py-2 text-sm text-theme-primary hover:bg-theme-surface/80 transition-colors"
          >
            {t('settings')}
          </button>

          {session.user?.role && ["ADMIN", "SUPER_ADMIN"].includes(session.user.role) && (
            <button
              onClick={() => handleNavigate('/admin')}
              className="w-full text-left px-4 py-2 text-sm text-purple-600 dark:text-purple-400 hover:bg-theme-surface/80 transition-colors"
            >
              {t('admin')}
            </button>
          )}

          <div className="border-t border-theme-subtle my-1"></div>

          <button
            onClick={handleLogout}
            className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-theme-surface/80 transition-colors"
          >
            {t('logout')}
          </button>
        </div>
      )}
    </div>
  );
}
