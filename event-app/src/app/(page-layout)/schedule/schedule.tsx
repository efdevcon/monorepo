"use client";

import APP_CONFIG from "@/CONFIG";
import { Schedule as ScheduleView } from "@/components/schedule";

export default function Schedule() {
  if (!APP_CONFIG.SCHEDULE_ENABLED) {
    return <div className="p-4 text-gray-500">Schedule is not enabled</div>;
  }

  return <ScheduleView />;
}
