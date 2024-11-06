import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

// Initialize the plugins
dayjs.extend(utc);
dayjs.extend(timezone);

import { ImageResponse } from "next/og";

// Route segment config
export const runtime = "edge";

// Image metadata
export const alt = "Devcon Schedule";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: { id: string } }) {
  const inter = await fetch(
    new URL("../../assets/Inter-Regular.ttf", import.meta.url)
  ).then((res) => res.arrayBuffer());

  const interMedium = await fetch(
    new URL("../../assets/Inter-Medium.ttf", import.meta.url)
  ).then((res) => res.arrayBuffer());

  const interBold = await fetch(
    new URL("../../assets/Inter-Bold.ttf", import.meta.url)
  ).then((res) => res.arrayBuffer());

  const showSlots = true;
  const url = process.env.SITE_URL || "http://localhost:3000";
  const apiUrl = process.env.API_URL || "http://localhost:4000";
  const res = await fetch(`${apiUrl}/sessions/${params.id}`);
  const { data } = await res.json();

  if (!data) {
    return new Response("Not found", { status: 404 });
  }

  function getExpertiseColor(expertise?: string) {
    if (expertise === "Beginner") return "bg-[#d2ffd6]";
    if (expertise === "Intermediate") return "bg-[#e3dcff]";
    if (expertise === "Expert") return "bg-[#f7dbe4]";

    return "bg-[#d0cbec]";
  }

  function getTrackImage(track?: string) {
    if (track === "Core Protocol") return "CoreProtocol.png";
    if (track === "Cypherpunk & Privacy") return "Cypherpunk.png";
    if (track === "Usability") return "Usability.png";
    if (track === "Real World Ethereum") return "RealWorldEthereum.png";
    if (track === "Applied Cryptography") return "AppliedCryptography.png";
    if (track === "Cryptoeconomics") return "CryptoEconomics.png";
    if (track === "Coordination") return "Coordination.png";
    if (track === "Developer Experience") return "DeveloperExperience.png";
    if (track === "Security") return "Security.png";
    if (track === "Layer 2") return "Layer2.png";
    if (track === "Entertainment") return "Entertainment.png";

    return "RealWorldEthereum.png";
  }

  function getTrackColor(track?: string) {
    if (track === "Core Protocol") return "bg-[#F6F2FF]";
    if (track === "Cypherpunk & Privacy") return "bg-[#FFF4FF]";
    if (track === "Usability") return "bg-[#FFF4F4]";
    if (track === "Real World Ethereum") return "bg-[#FFEDDF]";
    if (track === "Applied Cryptography") return "bg-[#FFFEF4]";
    if (track === "Cryptoeconomics") return "bg-[#F9FFDF]";
    if (track === "Coordination") return "bg-[#E9FFD7]";
    if (track === "Developer Experience") return "bg-[#E8FDFF]";
    if (track === "Security") return "bg-[#E4EEFF]";
    if (track === "Layer 2") return "bg-[#F0F1FF]";
    if (track === "Entertainment") return "bg-[#FFF0F2]";

    return "bg-[#FFEDDF]";
  }

  function getTitleClass(title: string) {
    if (title.length > 100) return "text-4xl";
    if (title.length > 90) return "text-4xl leading-snug";
    if (title.length > 70) return "text-5xl leading-snug";
    if (title.length > 35) return "text-5xl leading-snug";
    if (title.length > 18) return "text-6xl leading-snug";

    return "text-7xl leading-snug";
  }

  function getDay(date: string) {
    const day = dayjs(date).format("DD");
    if (day === "12") return "Day 1";
    if (day === "13") return "Day 2";
    if (day === "14") return "Day 3";
    if (day === "15") return "Day 4";

    return day;
  }

  console.log("DATA", data.slot_room);

  return new ImageResponse(
    (
      <div
        tw={`flex flex-row relative justify-between w-full h-full p-12 ${getTrackColor(
          data.track
        )}`}
        style={{ fontFamily: "Inter" }}
      >
        <div tw="flex absolute left-1/2 top-0 bottom-0 right-0">
          <img src={`${url}/dc7/prism.png`} tw="h-full opacity-80" />
        </div>

        <div tw="flex flex-col absolute bottom-12 left-12 w-full">
          <div
            tw="flex w-full my-6"
            style={{ borderTop: "3px dashed #cfd4eb" }}
          >
            &nbsp;
          </div>
          <div tw="flex flex-row">
            {data.speakers.length === 0 && <span tw="h-28">&nbsp;</span>}
            {data.speakers.map((i: any, index: number) => (
              <img
                key={i.id}
                src={i.avatar}
                tw="w-28 h-28 rounded-full border-4 border-white"
                style={{
                  marginLeft: index > 0 ? "-16px" : "0",
                  objectFit: "cover",
                }}
              />
            ))}
          </div>
        </div>

        {!data.track?.startsWith("[CLS]") && (
          <div tw="flex absolute bottom-0 right-0">
            <img
              src={`${url}/programming/${getTrackImage(data.track)}`}
              tw="h-[32rem]"
            />
          </div>
        )}

        <div tw="flex flex-row justify-end items-end absolute bottom-12 right-12 ">
          {data.track?.startsWith("[CLS]") ? (
            <>
              <div tw="flex flex-col items-end">
                <span tw="text-xl text-[#5B5F84]">Community-Led Sessions</span>
                <span tw="text-xl max-w-[440px] text-right break-words">
                  {data.track}
                </span>
              </div>
            </>
          ) : (
            <>
              <div
                tw={`flex flex-row items-center justify-center rounded-xl text-xl font-medium p-1 border border-1 border-[#cfd4eb] ${getTrackColor(
                  data.track
                )}`}
              >
                {data.type && (
                  <span tw="font-bold text-[#2d3540] rounded-xl px-2 py-1 bg-[#e1cdff]">
                    {data.type?.toUpperCase()}
                  </span>
                )}
                {data.expertise && (
                  <span
                    tw={`font-bold text-[#2d3540] rounded-xl px-2 py-1 ml-2 ${getExpertiseColor(
                      data.expertise
                    )}`}
                  >
                    {data.expertise?.toUpperCase()}
                  </span>
                )}
                {data.track && <span tw="mx-4">{data.track}</span>}
              </div>
            </>
          )}
        </div>

        <div tw="flex flex-col justify-between w-[700px] absolute top-12 left-12">
          <img src={`${url}/dc7/logo.png`} tw="w-60 mb-8" />

          <div tw="flex flex-col justify-center h-40 mb-4">
            <span
              tw={`text-[#36364C] leading-[12px] font-medium ${getTitleClass(
                data.title
              )}`}
              style={{ lineHeight: "1.2em" }}
            >
              {data.title}
            </span>
          </div>
          <div tw="flex">
            <span tw="text-[#5B5F84] text-2xl font-medium">
              {data.speakers.map((i: any) => i.name).join(", ")}
            </span>
          </div>
        </div>

        <div tw="flex flex-col justify-between absolute top-12 right-12">
          {showSlots && (
            <div tw="flex flex-row text-2xl justify-end items-end text-[#36364C]">
              <div tw="flex flex-col">
                <span>
                  <span>Room — </span>
                  <span tw="font-bold">
                    {data.slot_room.name}{" "}
                    {data.slot_room.description &&
                      `(${data.slot_room.description})`}
                  </span>
                </span>
                <span>
                  {data.slot_room.info && (
                    <>
                      <span>Floor — </span>
                      <span tw="font-bold">{data.slot_room.info}</span>
                    </>
                  )}
                </span>
              </div>
              <div tw="flex flex-col items-end ml-12">
                <span>
                  <span>{getDay(data.slot_start)} — </span>
                  <span tw="font-bold">
                    {dayjs(data.slot_start)
                      .tz("Asia/Bangkok")
                      .format("ddd, MMM DD")}
                  </span>
                </span>
                <span tw="font-bold">
                  {dayjs(data.slot_start).tz("Asia/Bangkok").format("h:mm a")} -{" "}
                  {dayjs(data.slot_end).tz("Asia/Bangkok").format("h:mm a")}
                </span>
              </div>
            </div>
          )}
          {!showSlots && (
            <div tw="flex flex-col text-2xl justify-end items-end">
              <span tw="font-bold uppercase text-[#5B5F84]">
                Bangkok, Thailand
              </span>
              <span tw="">
                <span tw="text-[#6B54AB] mr-2">12 — 15</span>Nov, 2024
              </span>
            </div>
          )}
        </div>
      </div>
    ),
    {
      fonts: [
        {
          name: "Inter",
          data: inter,
          weight: 400,
          style: "normal",
        },
        {
          name: "Inter",
          data: interMedium,
          weight: 500,
          style: "normal",
        },
        {
          name: "Inter",
          data: interBold,
          weight: 700,
          style: "normal",
        },
      ],
    }
  );
}
