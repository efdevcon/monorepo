import React from "react";
import CalendarIcon from "../../assets/icons/calendar.svg";
import Image, { StaticImageData } from "next/image";
import Link from "next/link";

type PastEventCard = {
  className?: string;
  image: StaticImageData;
  imageAlt: string;
  text: string;
  link: string;
};

export default (props: PastEventCard) => {
  return (
    <Link
      href={props.link}
      className={`group flex grow flex-col bg-[#F3F3F3] hover:border-neutral-400 cursor-pointer aspect-square border border-solid border-neutral-300 text-[#6A6868] [--icon-color:#6A6868] relative overflow-hidden min-h-[200px] min-w-[315px] max-w-full ${props.className}`}
    >
      <div className="relative overflow-hidden grow">
        <Image
          src={props.image}
          alt={props.imageAlt}
          className="h-full w-full object-fill scale-100 group-hover:scale-105 transition-transform duration-500 ease-in-out"
        />
      </div>
      <div className="flex shrink-0 grow-0 content-center justify-between py-6 px-4">
        <p className="flex items-center uppercase font-bold ">{props.text}</p>
        <CalendarIcon className="h-[32px] w-[32px] icon" />
      </div>
    </Link>
  );
};
