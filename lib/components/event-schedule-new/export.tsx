import React, { useState } from "react";
import Button from "lib/components/voxel-button/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "lib/components/ui/dialog";
import { Event } from "./model";
import { Calendar, Download, ExternalLink, X } from "lucide-react";
import moment from "moment";

interface ExportToIcsProps {
  events: Event[];
  // children: React.ReactNode;
  setExports: (exports: Event[] | null) => void;
}

// Convert UTC to Buenos Aires time (UTC-3)
// const convertUTCToBuenosAires = (dateString: string) => {
//   return moment.utc(dateString); //.subtract(3, "hours");
// };

// Generate RFC 5545 compliant timestamp in Buenos Aires local time
const formatICSDate = (dateString: string): string => {
  const baTime = moment.utc(dateString).add(3, "hours"); // Convert back to UTC (add 3 hours which were subtracted at a higher level)

  return baTime.format("YYYYMMDDTHHmmss") + "Z";
};

// Format date for Google Calendar (no conversion - Google handles timezone with ctz param)
const formatGoogleDate = (dateString: string): string => {
  // Don't convert, just format the UTC time
  return moment.utc(dateString).format("YYYYMMDDTHHmmss");
};

// Escape special characters for ICS format
const escapeICSText = (text: string): string => {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "");
};

// Generate ICS file content
const generateICSContent = (events: Event[]): string => {
  const icsEvents = events.map((event) => {
    // Get overall event start/end from first and last timeblock
    const startTime = event.timeblocks[0].start;
    const endTime = event.timeblocks[event.timeblocks.length - 1].end;

    const location =
      typeof event.location === "string"
        ? event.location
        : event.location.text || event.location.url;

    // Check if it's a multi-day event
    // const startMoment = moment.utc(startTime).add(3, "hours"); // Convert back to UTC (add 3 hours which were subtracted at a higher level)
    // const endMoment = moment.utc(endTime).add(3, "hours"); // Convert back to UTC (add 3 hours which were subtracted at a higher level)
    // const isMultiDay = !startMoment.isSame(endMoment, "day");

    // Build description with timeblock details if multi-day
    let description = event.description;
    // if (isMultiDay && event.timeblocks.length > 1) {
    //   description += "\n\nSchedule:";
    //   event.timeblocks.forEach((tb, index) => {
    //     const tbStart = moment.utc(tb.start);
    //     const tbEnd = moment.utc(tb.end);
    //     description += `\nDay ${index + 1}: ${tbStart.format(
    //       "MMM DD, HH:mm"
    //     )} - ${tbEnd.format("HH:mm")}`;
    //   });
    // }
    if (event.eventLink) {
      description += `\n\nEvent Link: ${event.eventLink}`;
    }

    return [
      "BEGIN:VEVENT",
      `UID:${event.id}`,
      `DTSTART:${formatICSDate(startTime)}`,
      `DTEND:${formatICSDate(endTime)}`,
      `SUMMARY:${escapeICSText(event.name)}`,
      `DESCRIPTION:${escapeICSText(description)}`,
      `ORGANIZER:${escapeICSText(event.organizer)}`,
      `LOCATION:${escapeICSText(location)}`,
      // `CATEGORIES:${escapeICSText(event.categories.join(","))}`,
      `STATUS:CONFIRMED`,
      `CREATED:${formatICSDate(new Date().toISOString())}`,
      "END:VEVENT",
    ].join("\r\n");
  });

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:Devconnect-2025",
    "CALSCALE:GREGORIAN",
    ...icsEvents,
    "END:VCALENDAR",
  ].join("\r\n");
};

// Generate Google Calendar URL for a single event
const generateGoogleCalendarURL = (event: Event): string => {
  // Use first and last timeblock for overall event duration
  const startTime = event.timeblocks[0].start;
  const endTime = event.timeblocks[event.timeblocks.length - 1].end;

  const startDate = formatGoogleDate(startTime);
  const endDate = formatGoogleDate(endTime);

  const location =
    typeof event.location === "string"
      ? event.location
      : event.location.text || event.location.url;

  // Check if multi-day event
  const startMoment = moment.utc(startTime);
  const endMoment = moment.utc(endTime);
  const isMultiDay = !startMoment.isSame(endMoment, "day");

  // Build description with timeblock details if multi-day
  let details = event.description;
  if (isMultiDay && event.timeblocks.length > 1) {
    details += "\n\nSchedule:";
    event.timeblocks.forEach((tb, index) => {
      const tbStart = moment.utc(tb.start);
      const tbEnd = moment.utc(tb.end);
      details += `\nDay ${index + 1}: ${tbStart.format(
        "MMM DD, HH:mm"
      )} - ${tbEnd.format("HH:mm")}`;
    });
  }
  if (event.eventLink) {
    details += `\n\nEvent Link: ${event.eventLink}`;
  }

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.name,
    ctz: "America/Buenos_Aires",
    dates: `${startDate}/${endDate}`,
    details: details,
    location: location,
    sf: "true",
    output: "xml",
  });

  return `https://www.google.com/calendar/render?${params.toString()}`;
};

// Download ICS file
const downloadICSFile = (
  content: string,
  filename: string = "devconnect-2025-events.ics"
) => {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const ExportToIcs: React.FC<ExportToIcsProps> = ({ events, setExports }) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleICSExport = async () => {
    setIsExporting(true);
    try {
      const icsContent = generateICSContent(events);
      downloadICSFile(icsContent);
    } catch (error) {
      console.error("Failed to export ICS file:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleGoogleCalendarExport = () => {
    // Open Google Calendar for each event in new tabs
    events.forEach((event) => {
      const url = generateGoogleCalendarURL(event);
      window.open(url, "_blank");
    });
  };

  const totalEvents = events.reduce(
    (sum, event) => sum + event.timeblocks.length,
    0
  );

  return (
    <Dialog open onOpenChange={() => setExports(null)}>
      {/* <DialogTrigger asChild>
        {children || (
          <button className="flex items-center gap-2 text-sm font-medium border border-[rgba(224,224,235,1)] border-solid p-4 py-2 transition-colors duration-300 shrink-0 hover:bg-gray-50">
            <Calendar size={13} />
            Export
          </button>
        )}
      </DialogTrigger> */}
      <DialogContent
        className="sm:max-w-md p-4 shadow-xl border-black"
        onInteractOutside={(e) => {
          e.stopPropagation();
          e.preventDefault();

          setExports(null);
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 mb-4">
            <Calendar className="h-5 w-5" />
            Export Event{events.length > 1 ? "s" : ""}
          </DialogTitle>
          {events.length > 1 && (
            <DialogDescription>
              Export {events.length} events ({totalEvents} total sessions) to
              your calendar of choice
            </DialogDescription>
          )}
          {events.length === 1 && (
            <DialogDescription>
              Export {events[0].name} to your calendar
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="absolute top-4 right-4 z-10">
          <div
            className="bg-white p-1.5 cursor-pointer border border-solid border-neutral-400"
            onClick={(e) => {
              e.stopPropagation();

              setExports(null);
            }}
          >
            <X className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-red-400">
          Be mindful that event changes and updates will not be reflected once
          you export to your own calendar. It is important to check back closer
          to the event date to make sure your calendar matches the schedule.
        </div>

        <div className="">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <Download className="h-5 w-5 text-blue-600" />
                <div>
                  <h3 className="font-medium">Download .ics file</h3>
                  <p className="text-sm text-gray-600">
                    Import into any calendar app
                  </p>
                </div>
              </div>
              <Button
                onClick={handleICSExport}
                size="sm"
                disabled={isExporting}
                className="shrink-0"
              >
                {isExporting ? "Exporting..." : "Download"}
              </Button>
            </div>

            {events.length === 1 && (
              <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <ExternalLink className="h-5 w-5 text-green-600" />
                  <div>
                    <h3 className="font-medium">Add to Google Calendar</h3>
                    <p className="text-sm text-gray-600">
                      Opens event in Google Calendar
                    </p>
                  </div>
                </div>

                <Button
                  onClick={handleGoogleCalendarExport}
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                >
                  Add Event
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExportToIcs;
