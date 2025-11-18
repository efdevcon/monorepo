'use client';
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import SwipeToScroll from 'lib/components/event-schedule/swipe-to-scroll-native';
import cn from 'classnames';
import Image9 from '@/images/announcements/09.jpg';
import Image6 from '@/images/announcements/06.jpg';
import PhoneImage from '@/images/announcements/phones.jpg';
import VoxelImage from '@/images/voxel-car.jpg';
import Image1 from '@/images/announcements/01.jpg';
import Image12 from '@/images/announcements/12.jpg';
import EthCon from '@/images/announcements/ethcon-arg.jpeg';
import TranslationsPost from '@/images/announcements/translations_post.webp';
import { StaticImageData } from 'next/image';
import { useDraggableLink } from 'lib/hooks/useDraggableLink';
import { useTranslations } from 'next-intl';

// Placeholder images - you can replace these with actual highlight images
// const PlaceholderImage = '/images/quest-app-showcase.png';

type HighlightCardProps = {
  title: string;
  to: string;
  description: string;
  image: StaticImageData;
  className?: string;
};

const HighlightCard = ({
  title,
  to,
  description,
  image,
  className,
}: HighlightCardProps) => {
  const draggableLink = useDraggableLink();
  const isExternal = to.startsWith('http://') || to.startsWith('https://');

  const cardContent = (
    <>
      <Image
        src={image}
        alt={title}
        width={295}
        placeholder="blur"
        height={150}
        className="aspect-[4/2] object-cover group-hover:scale-105 transition-all duration-500 will-change-transform cursor-pointer"
      />
      <div className="flex flex-col bg-white z-[10] relative">
        <p className="font-semibold text-base px-4 py-2 pt-3 pb-1">{title}</p>
        <div className="text-sm px-4 pb-4">{description}</div>
      </div>
    </>
  );

  const linkClassName = cn(
    'shrink-0 bg-white border border-solid border-[#E4E6EB] w-[295px] overflow-hidden group',
    className
  );

  if (isExternal) {
    return (
      <a
        href={to}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClassName}
        {...draggableLink}
      >
        {cardContent}
      </a>
    );
  }

  return (
    <Link href={to} className={linkClassName} {...draggableLink}>
      {cardContent}
    </Link>
  );
};

export const Highlights = () => {
  const t = useTranslations('highlights');

  const highlights = [
    {
      title: t('ethcon'),
      to: 'https://ethcon.ar/',
      description: t('ethconDescription'),
      image: EthCon,
    },
    {
      title: t('translationsPost'),
      to: '/wallet/settings',
      description: t('translationsPostDescription'),
      image: TranslationsPost,
    },
    {
      title: t('ethereumDay'),
      to: '/stages/xl',
      description: t('ethereumDayDescription'),
      image: Image6,
    },

    // {
    //   title: 'Pre-Fair Planning',
    //   to: '/schedule',
    //   description:
    //     'Create your Worlds Fair account, mark your favorite events, load your wallet & tickets, and more.',
    //   image: Image12,
    // },

    {
      title: t('installApp'),
      to: '/wallet',
      description: t('installAppDescription'),
      image: PhoneImage,
    },
    {
      title: t('devconnectPerks'),
      to: 'https://devconnect.org/perks',
      description: t('devconnectPerksDescription'),
      image: VoxelImage,
    },
    // {
    //   title: 'Networking Events',
    //   to: '/schedule',
    //   description:
    //     'Connect with fellow developers, builders, and Ethereum enthusiasts.',
    //   image: Image6,
    // },
    // {
    //   title: 'City Guide',
    //   to: '/map',
    //   description:
    //     'Explore Buenos Aires and discover the best spots for Ethereum community members.',
    //   image: Image6,
    // },
  ];

  return (
    <div className="flex flex-col w-screen md:w-auto overflow-hidden md:overflow-visible mb-4 [mask-image:linear-gradient(to_right,transparent_0%,black_16px,black_calc(100%-32px),transparent_100%)]">
      <div className="flex justify-between font-bold border-top mb-3 ml-4">
        {t('title')}
      </div>
      <SwipeToScroll>
        <div className="flex no-wrap gap-2 ml-4 pr-4 ">
          {highlights.map((highlight, index) => (
            <HighlightCard
              key={index}
              title={highlight.title}
              to={highlight.to}
              description={highlight.description}
              image={highlight.image}
            />
          ))}
          <div className="w-[12px] pointer-events-none h-[1px] shrink-0" />
        </div>
      </SwipeToScroll>
    </div>
  );
};

export default Highlights;
