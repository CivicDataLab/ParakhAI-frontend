import { ROUTES } from '@/constants';

export type NavLink = {
  label: string;
  href: string;
};

/** Primary navigation links shown in MainNav (desktop + mobile). */
export const mainNavigationLinks: NavLink[] = [{ label: 'Resources', href: ROUTES.resources }];
