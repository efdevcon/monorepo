import { HomeIcon, CalendarIcon, TicketIcon } from 'lucide-react';

export const homeTabs = () => [
  {
    label: 'Home',
    labelIcon: HomeIcon,
    href: '/',
    component: () => null,
    isActive: (pathname: string) => pathname === '/',
  },
  {
    label: 'Schedule',
    labelIcon: CalendarIcon,
    href: '/schedule',
    component: () => null,
    isActive: (pathname: string) => pathname === '/schedule',
  },
  {
    label: 'Tickets',
    labelIcon: TicketIcon,
    href: '/tickets',
    component: () => null,
    isActive: (pathname: string) => pathname === '/tickets',
  },
];

