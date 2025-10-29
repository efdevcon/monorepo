import { Event } from "../model";
import moment from "moment";
import cn from "classnames";

export const getProgramming = (event: Event) => {
  const isETHDay = event.id.toString() === "84";
  const isCoworking = event.id.toString() === "23";

  if (isETHDay) {
    // Add dummy sessions for ETH Day
    const dummySessions = [
      {
        title: "Opening Ceremony",
        speakers: "Devconnect Team",
      },
      {
        title: "EF & Ethereum Update",
        speakers: "Tomasz K. Stańczak",
      },
      {
        title: "The Trillion Dollar Security initiative",
        speakers: "Mehdi Zerouali",
      },
      {
        title: "Ethereum is for Institutions and Enterprises",
        speakers: "Danny Ryan",
      },
      {
        title: "Ethereum In 30 minutes",
        speakers: "Vitalik Buterin",
      },
      {
        title: "Ethereum Ecosystem overview",
        speakers: "Jason Chaskin",
      },
      {
        title: "Stablecoins and Argentina",
        speakers: "Mariano Conti",
      },
      {
        title: "Local Web3 Companies (Lambda Class)",
        speakers: "Fede",
      },
      {
        title: "Local Web3 Companies (POAP)",
        speakers: "Isabel Gonzalez",
      },
      {
        title: "Argentina talk",
        speakers: "Santiago Palladino",
      },
      {
        title: "Defi: AAVE",
        speakers: "Stani",
      },
      {
        title: "App: Farcaster",
        speakers: "Linda Xie",
      },
      {
        title: "Privacy in Ethereum",
        speakers: "Peter Van Valkenburgh",
      },
      {
        title: "Stay tuned for more programming - and speaker announcements 👀",
        faded: true,
      },
    ];

    return dummySessions;
  }

  if (isCoworking) {
    const dummySessions = [
      {
        title: "Application showcases",
        start: "9:00",
        end: "10:00",
      },
      {
        title: "Open cowork",
        start: "9:00",
        end: "18:00",
      },
      {
        title: "Community hubs",
        start: "9:00",
        end: "18:00",
      },
      {
        title: "Lightning talks",
        start: "11:00",
        end: "12:00",
      },
      {
        title: "Art installations",
        start: "9:00",
        end: "18:00",
      },
      {
        title: "Football tournaments ⚽",
        start: "14:00",
        end: "16:00",
      },
      {
        title: "Livestreams",
        start: "9:00",
        end: "18:00",
      },
      {
        title: "Discussion corners",
        start: "9:00",
        end: "18:00",
      },
      {
        title: "Meeting rooms",
        start: "9:00",
        end: "18:00",
      },
      {
        title: "Food and beverages",
        start: "9:00",
        end: "18:00",
      },
      {
        title: "Activations",
        start: "9:00",
        end: "18:00",
      },
      {
        title: "Devconnect Music Space",
        speakers: "Shakalei",
        start: "10:00",
        end: "11:00",
      },
    ];

    return dummySessions;
  }

  // event.timeblocks.forEach((timeblock) => {
  //   const startDate = moment(timeblock.start).format("MMM DD");
  //   const endDate = moment(timeblock.end).format("MMM DD");
  //   const startTime = moment(timeblock.start).format("HH:mm");
  // });

  return null;
};

export const Programming = ({
  event,
  programming,
  showMobileProgramming,
}: {
  event: Event;
  programming: any;
  showMobileProgramming: boolean;
}) => {
  const isETHDay = event.id.toString() === "84";

  if (!programming) {
    return null;
  }

  return (
    <div
      className={cn(
        "relative w-[40%] shrink-0 overflow-hidden !border-l border-solid !border-neutral-300 hidden lg:block",
        showMobileProgramming &&
          "!block !absolute top-0 left-0 right-0 bottom-0 !w-full !h-full z-[1] !bg-white"
      )}
    >
      <div
        className="absolute top-0 left-0 w-full h-full overflow-y-auto  "
        style={{
          maskImage:
            "linear-gradient(to bottom, black 0%, black calc(100% - 24px), transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, black 0%, black calc(100% - 24px), transparent 100%)",
        }}
      >
        <div className={cn("flex flex-col w-full shrink-0  bg-white")}>
          <div
            className={cn(
              "text-lg px-4 pt-4 pb-4 font-medium border-b border-solid bg-[#FFEBF0] border-neutral-300 sticky top-0 z-[1]"
            )}
          >
            <div className="flex items-center gap-1.5 text-black">
              {isETHDay ? "Ethereum Day Programming" : "Featuring"}
              {/* <ScrollText className="w-5 h-5 shrink-0" /> */}
            </div>
          </div>
          {programming.map((timeblock: any, index: number) => {
            return (
              <div
                key={timeblock.title}
                className={cn(
                  "p-2.5 px-3.5 text-sm border-b border-solid border-neutral-300 bg-white",
                  index === programming.length - 1 && "border-b-0 mb-8"
                )}
              >
                <div className="flex flex-col">
                  <div
                    className={cn(
                      "font-medium",
                      timeblock.faded && "text-gray-700 text-[11px]"
                    )}
                  >
                    {timeblock.title}
                  </div>
                  <div className="flex items-center gap-1 text-[11px]">
                    {/* <MicVocal className="w-3 h-3 shrink-0" /> */}
                    {timeblock.speakers}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
