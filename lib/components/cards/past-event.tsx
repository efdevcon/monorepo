import React from "react";
import CalendarIcon from "../../assets/icons/calendar.svg";
import Image, { StaticImageData } from "next/image";
import Link from "next/link";
import { useDraggableLink } from "../../hooks/useDraggableLink";

type PastEventCard = {
  className?: string;
  image: StaticImageData;
  imageAlt: string;
  text: string;
  link: string;
};

export default (props: PastEventCard) => {
  const dragAttributes = useDraggableLink();

  return (
    <Link
      href={props.link}
      {...dragAttributes}
      className={`group rounded-lg relative flex flex-col shadow hover:border-[#74abde] cursor-pointer aspect-square border border-solid border-[#74abde] text-[#6A6868] [--icon-color:#6A6868] relative overflow-hidden min-h-[200px] min-w-[315px] max-w-full ${props.className}`}
    >
      <div className="relative overflow-hidden grow">
        <Image
          src={props.image}
          alt={props.imageAlt}
          className="h-full w-full object-fill scale-100 group-hover:scale-105 transition-transform duration-500 ease-in-out"
        />
      </div>

      <div className="absolute bottom-1.5 right-1.5">
        <div className="bg-teal-500/80 text-white px-2 py-1 rounded-lg backdrop-blur-sm">
          {props.text}
        </div>
      </div>
      {/* <div className="flex shrink-0 grow-0 content-center justify-between py-2.5 px-3">
        <p className="flex items-center text-teal-400">{props.text}</p>
      </div> */}
    </Link>
  );
};
