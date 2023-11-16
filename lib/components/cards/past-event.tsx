import React from "react";
import CalendarIcon from "../../assets/icons/calendar.svg";

type PastEventCard = {
  className?: string;
  // Making image rendering framework agnostic for now
  renderImage: () => React.ReactNode;
  text: string;
};

export default (props: PastEventCard) => {
  return (
    <div
      className={`flex grow flex-col bg-[#F3F3F3] aspect-square border border-solid border-neutral-300   text-[#6A6868] [--icon-color:#6A6868] relative overflow-hidden min-h-[200px] min-w-[315px] max-w-full ${props.className}`}
    >
      <div className="relative overflow-hidden grow">
        <props.renderImage />
      </div>
      <div className="flex shrink-0 grow-0 content-center justify-between py-6 px-4">
        <p className="flex items-center uppercase font-bold ">{props.text}</p>
        <CalendarIcon className="h-[32px] w-[32px] icon" />
      </div>
    </div>
  );
};
