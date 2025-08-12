import React from "react";
import { Button } from "lib/components/button";
import cn from "classnames";
import { ListFilter, Search } from "lucide-react";

const venueEvents = [
  { color: "bg-[rgba(255,133,166,1)]", label: "Cowork" },
  { color: "bg-[rgba(116,172,223,1)]", label: "Core" },
  { color: "bg-[rgba(246,180,14,1)]", label: "Partner" },
];

const communityEvents = [
  { color: "bg-[rgba(136,85,204,1)]", label: "Community" },
];

const ActionBar = ({
  isCommunityCalendar,
}: {
  isCommunityCalendar: boolean;
}) => {
  const categories = isCommunityCalendar ? communityEvents : venueEvents;
  const hasLoggedInUser = true;

  return (
    <div className="flex justify-between items-center w-full gap-4">
      <button className="flex items-center gap-2 text-sm font-medium border border-[rgba(224,224,235,1)] border-solid p-4 py-2">
        <ListFilter size={13} />
        Filter
      </button>

      <div className="flex items-center gap-4">
        {categories.map((category) => (
          <div
            key={category.label}
            className={cn("text-sm font-medium flex items-center gap-1.5")}
          >
            <div className={cn("w-[14px] h-[14px]", category.color)} />
            {category.label}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-end grow gap-2">
        <Search size={13} />
        Search
      </div>
    </div>
  );
};

export default ActionBar;
