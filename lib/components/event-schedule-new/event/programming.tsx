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
        time: "9:00",
        title: "Opening Ceremony",
        speakers: "-",
      },
      {
        time: "9:30",
        title: "Devconnect Opening",
        speakers: "Nathan Sexer / Devconnect Team",
      },
      {
        time: "9:45",
        title: "EF & Ethereum Update",
        speakers: "Tomasz Stanczak",
      },
      {
        time: "10:05",
        title: "EF & Ethereum Update",
        speakers: "Hsiao-Wei Wang",
      },
      {
        time: "10:25",
        title: "EF Priorities (Scale L1 / L2 / UX)",
        speakers: "Ansgar Dietrichs, Barnabé Monnot",
      },
      {
        time: "10:55",
        title: "The Trillion Dollar Security initiative",
        speakers: "Fredrik Svantes, Mehdi Zerouali",
      },
      {
        time: "11:25",
        title: "Ethereum is for Institutions and Enterprises",
        speakers: "Danny Ryan",
      },
      {
        time: "11:55",
        title: "Ethereum (Roadmap) in 30min",
        speakers: "Vitalik Buterin",
      },
      {
        time: "12:30",
        title: "LUNCH BREAK",
        speakers: "-",
      },
      {
        time: "13:15",
        title:
          "POAP: How Argentina Adopted Crypto, and what it means for the rest of us",
        speakers: "Isabel Gonzalez",
      },
      {
        time: "13:45",
        title: "Stablecoins and Argentina",
        speakers: "Mariano Conti",
      },
      {
        time: "14:15",
        title: "Lambda Class: Local Web3 Companies",
        speakers: "Fede Intern",
      },
      {
        time: "14:45",
        title: "Ethereum, Everywhere (All at Once)",
        speakers: "Santiago Palladino",
      },
      {
        time: "15:15",
        title: "Ethereum Ecosystem overview",
        speakers: "Jason Chaskin",
      },
      {
        time: "12:30",
        title: "COFFEE BREAK",
        speakers: "-",
      },
      {
        time: "16:00",
        title: "Base Announcement",
        speakers: "Jesse Pollak",
      },
      {
        time: "16:15",
        title: "Linea Announcement",
        speakers: "Declan Fox",
      },
      {
        time: "16:25",
        title: "L2 Panel",
        speakers:
          "Josh Rudolf, Jesse Pollak, Steven Goldfeder, Mark Tyneway, Oren Katz, Alex Gluchovski",
      },
      {
        time: "17:00",
        title: "Aave: The New Architecture of Credit: Programming Trust",
        speakers: "Stani Kulechov",
      },
      {
        time: "17:30",
        title: "CowSwap: Making DeFi Truly Cross-Chain",
        speakers: "Anna George",
      },
      {
        time: "18:00",
        title: "Farcaster: Crypto Apps and Decentralized SocialShort",
        speakers: "Linda Xie",
      },
      {
        time: "18:30",
        title: "Privacy on Ethereum",
        speakers: "Peter Van Valkenburgh",
      },
      {
        time: "19:00",
        title: "Closing note, announcement",
        speakers: "Nathan Sexer / Devconnect Team",
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
                  <div className="flex items-center gap-1 text-[11px] leading-tight">
                    {/* <MicVocal className="w-3 h-3 shrink-0" /> */}
                    {timeblock.speakers}
                  </div>
                  <div className="text-[11px]">{timeblock.time}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
