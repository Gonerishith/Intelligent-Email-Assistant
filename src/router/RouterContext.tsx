import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppRoute } from '../types/navigation';

interface RouterContextType {
  currentPath: AppRoute;
  navigate: (to: AppRoute | string) => void;
}

const RouterContext = createContext<RouterContextType>({
  currentPath: '/',
  navigate: () => {},
});

function normalizeRoute(path: string): AppRoute {
  if (path.startsWith('/login')) return '/login';
  if (path.startsWith('/inbox')) return '/inbox';
  if (path.startsWith('/compose')) return '/compose';
  if (path.startsWith('/settings')) return '/settings';
  if (path.startsWith('/activity')) return '/activity';
  return '/';
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const [currentPath, setCurrentPath] = useState<AppRoute>(() => {
    if (typeof window !== 'undefined') {
      return normalizeRoute(window.location.pathname);
    }
    return '/';
  });

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(normalizeRoute(window.location.pathname));
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (to: AppRoute | string) => {
    const normalized = normalizeRoute(to);
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', to);
    }
    setCurrentPath(normalized);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <RouterContext.Provider value={{ currentPath, navigate }}>
      {children}
    </RouterContext.Provider>
  );
}

export function useRouter() {
  return useContext(RouterContext);
}
