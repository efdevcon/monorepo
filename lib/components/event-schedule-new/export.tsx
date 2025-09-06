import React, { useState } from "react";
import Button from "lib/components/voxel-button/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "lib/components/ui/dialog";
import { Event } from "./model";
import { format, parseISO } from "date-fns";
import { Calendar, Download, ExternalLink } from "lucide-react";

interface ExportToIcsProps {
  events: Event[];
  children: React.ReactNode;
}

// Generate RFC 5545 compliant timestamp
const formatICSDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
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
  const icsEvents = events.flatMap((event) =>
    event.timeblocks.map((timeblock) => {
      const location =
        typeof event.location === "string"
          ? event.location
          : event.location.text || event.location.url;

      return [
        "BEGIN:VEVENT",
        `UID:${event.id}-${timeblock.start}@devcon.org`,
        `DTSTART:${formatICSDate(timeblock.start)}`,
        `DTEND:${formatICSDate(timeblock.end)}`,
        `SUMMARY:${escapeICSText(event.name)}`,
        `DESCRIPTION:${escapeICSText(
          event.description +
            (event.eventLink ? `\n\nEvent Link: ${event.eventLink}` : "")
        )}`,
        `ORGANIZER:${escapeICSText(event.organizer)}`,
        `LOCATION:${escapeICSText(location)}`,
        `CATEGORIES:${escapeICSText(event.categories.join(","))}`,
        `STATUS:CONFIRMED`,
        `CREATED:${formatICSDate(new Date().toISOString())}`,
        "END:VEVENT",
      ].join("\r\n");
    })
  );

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Devcon//Event Schedule//EN",
    "CALSCALE:GREGORIAN",
    ...icsEvents,
    "END:VCALENDAR",
  ].join("\r\n");
};

// Generate Google Calendar URL for a single event
const generateGoogleCalendarURL = (
  event: Event,
  timeblock: Event["timeblocks"][0]
): string => {
  const startDate = formatICSDate(timeblock.start);
  const endDate = formatICSDate(timeblock.end);
  const location =
    typeof event.location === "string"
      ? event.location
      : event.location.text || event.location.url;

  const details = `${event.description}${
    event.eventLink ? `\n\nEvent Link: ${event.eventLink}` : ""
  }`;

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.name,
    dates: `${startDate}/${endDate}`,
    details: details,
    location: location,
    sf: "true",
    output: "xml",
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

// Download ICS file
const downloadICSFile = (
  content: string,
  filename: string = "devcon-events.ics"
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

const ExportToIcs: React.FC<ExportToIcsProps> = ({ events, children }) => {
  const [open, setOpen] = useState(false);
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
      event.timeblocks.forEach((timeblock) => {
        const url = generateGoogleCalendarURL(event, timeblock);
        window.open(url, "_blank");
      });
    });
  };

  const totalEvents = events.reduce(
    (sum, event) => sum + event.timeblocks.length,
    0
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <button className="flex items-center gap-2 text-sm font-medium border border-[rgba(224,224,235,1)] border-solid p-4 py-2 transition-colors duration-300 shrink-0 hover:bg-gray-50">
            <Calendar size={13} />
            Export
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md p-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Export Events
          </DialogTitle>
          <DialogDescription>
            Export {events.length} events ({totalEvents} total sessions) to your
            calendar
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
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

            <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <ExternalLink className="h-5 w-5 text-green-600" />
                <div>
                  <h3 className="font-medium">Add to Google Calendar</h3>
                  <p className="text-sm text-gray-600">
                    Opens each event in Google Calendar
                  </p>
                </div>
              </div>
              <Button
                onClick={handleGoogleCalendarExport}
                variant="outline"
                size="sm"
                className="shrink-0"
              >
                Add Events
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExportToIcs;
