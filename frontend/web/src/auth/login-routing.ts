import type { Role } from '../types';

const DEFAULT_ROUTES: Record<Role, string> = {
  ADMIN: '/admin/dashboard',
  VENDOR: '/vendor/dashboard',
  CUSTOMER: '/store',
};

const LOGIN_PATHS = new Set([
  '/login',
  '/admin/login',
  '/store/login',
  '/store/checkout/login',
  '/user/login',
]);

const CUSTOMER_STORE_PATHS = [
  '/store/account',
  '/store/cart',
  '/store/checkout',
  '/store/favorites',
  '/store/orders',
];

export const getDefaultRouteForRole = (role: Role) => DEFAULT_ROUTES[role];

const cleanReturnTo = (returnTo?: string | null) => {
  if (!returnTo || !returnTo.startsWith('/') || returnTo.startsWith('//')) {
    return null;
  }

  const path = returnTo.split(/[?#]/, 1)[0];
  return LOGIN_PATHS.has(path) ? null : returnTo;
};

const canRoleAccessReturnTo = (role: Role, returnTo: string) => {
  if (returnTo.startsWith('/admin')) {
    return role === 'ADMIN';
  }

  if (returnTo.startsWith('/vendor')) {
    return role === 'VENDOR';
  }

  if (returnTo.startsWith('/user')) {
    return role === 'CUSTOMER';
  }

  if (
    CUSTOMER_STORE_PATHS.some((path) => (
      returnTo === path ||
      returnTo.startsWith(`${path}/`) ||
      returnTo.startsWith(`${path}?`) ||
      returnTo.startsWith(`${path}#`)
    ))
  ) {
    return role === 'CUSTOMER';
  }

  return returnTo.startsWith('/store');
};

export const getLoginDestination = (
  role: Role,
  requestedReturnTo?: string | null,
) => {
  const returnTo = cleanReturnTo(requestedReturnTo);

  if (returnTo && canRoleAccessReturnTo(role, returnTo)) {
    return returnTo;
  }

  return getDefaultRouteForRole(role);
};
