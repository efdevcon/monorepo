import { createElement } from 'react';
import Icon from '@mdi/react';
import {
  mdiHome,
  mdiCalendarRangeOutline,
  mdiTicket,
  mdiBullhorn,
  mdiBellAlert,
} from '@mdi/js';

// Icon wrapper components for home tabs
const HomeTabIcon = ({ color }: { color?: string }) =>
  createElement(Icon, { path: mdiHome, size: 0.65, color });
const ScheduleTabIcon = ({ color }: { color?: string }) =>
  createElement(Icon, { path: mdiCalendarRangeOutline, size: 0.65, color });
const TicketsTabIcon = ({ color }: { color?: string }) =>
  createElement(Icon, { path: mdiTicket, size: 0.65, color });
const AnnouncementsTabIcon = ({ color }: { color?: string }) =>
  createElement(Icon, { path: mdiBullhorn, size: 0.65, color });

export const homeTabs = () => [
  {
    label: 'Home',
    labelIcon: HomeTabIcon,
    href: '/',
    component: () => null,
    isActive: (pathname: string) => pathname === '/',
  },
  {
    label: 'Schedule',
    labelIcon: ScheduleTabIcon,
    href: '/schedule',
    component: () => null,
    isActive: (pathname: string) => pathname === '/schedule',
  },
  {
    label: 'Tickets',
    labelIcon: TicketsTabIcon,
    href: '/tickets',
    component: () => null,
    isActive: (pathname: string) => pathname === '/tickets',
  },
  {
    label: 'Announcements',
    labelIcon: AnnouncementsTabIcon,
    href: '/announcements',
    component: () => null,
    isActive: (pathname: string) => pathname === '/announcements',
  },
];
