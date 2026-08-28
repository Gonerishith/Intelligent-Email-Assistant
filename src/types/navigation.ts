export type AppRoute = '/' | '/login' | '/inbox' | '/compose' | '/settings' | '/activity';

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  path: AppRoute;
  badgeCount?: number;
}
