import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import {
  getExpertiseColor,
  getSession,
  getTitleClass,
  getTrackColor,
  getTrackImage,
  fetchSpeakerImages,
  getSpeakerClass,
} from "@/app/utils";

// Initialize the plugins
dayjs.extend(utc);
dayjs.extend(timezone);

import { ImageResponse } from "next/og";

// Route segment config
export const runtime = "edge";

// Image metadata
export const alt = "Devcon Schedule";
export const size = { width: 1920, height: 1080 };
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

  const url = process.env.SITE_URL || "http://localhost:3000";
  const data = await getSession(params.id);

  if (!data) {
    return new Response("Not found", { status: 404 });
  }

  const speakerImages = await fetchSpeakerImages(data);
  console.log("TITLE LENGTH", data.title.length);

  return new ImageResponse(
    (
      <div
        tw={`flex flex-row relative justify-between w-full h-full p-20 ${getTrackColor(
          data.track
        )}`}
        style={{ fontFamily: "Inter" }}
      >
        <div tw="flex absolute left-1/2 top-0 bottom-0 right-0">
          <img src={`${url}/dc7/prism.png`} tw="h-full opacity-80" />
        </div>

        <div tw="flex flex-col absolute bottom-20 left-20 w-full">
          <div
            tw="flex w-full my-12"
            style={{ borderTop: "4px dashed #cfd4eb" }}
          >
            &nbsp;
          </div>
          <div tw="flex flex-row">
            {data.speakers.length === 0 && <span tw="h-44">&nbsp;</span>}
            {speakerImages.map((i: any, index: number) => (
              <img
                key={i.id}
                src={i.imageSrc}
                width={data.speakers.length > 6 ? 80 : 176} // w-20 = 80px, w-44 = 176px
                height={data.speakers.length > 6 ? 80 : 176}
                tw={`rounded-full border-4 border-white ${
                  data.speakers.length > 6 ? "w-20 h-20" : "w-44 h-44"
                }`}
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
              tw="h-[38rem]"
            />
          </div>
        )}

        <div tw="flex flex-row justify-end items-end absolute bottom-20 right-20">
          {data.track?.startsWith("[CLS]") ? (
            <>
              <div tw="flex flex-col items-end">
                <span tw="text-4xl text-[#5B5F84]">Community-Led Sessions</span>
                <span tw="text-4xl max-w-[800px] text-right break-words leading-normal">
                  {data.track}
                </span>
              </div>
            </>
          ) : (
            <>
              <div
                tw={`flex flex-row items-center justify-center rounded-xl text-4xl font-medium p-2 border border-2 border-[#cfd4eb] ${getTrackColor(
                  data.track
                )}`}
              >
                {data.type && (
                  <span tw="font-bold text-[#2d3540] rounded-xl px-4 py-2 bg-[#e1cdff]">
                    {data.type?.toUpperCase()}
                  </span>
                )}
                {data.expertise && (
                  <span
                    tw={`font-bold text-[#2d3540] rounded-xl px-4 py-2 ml-4 ${getExpertiseColor(
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

        <div
          tw={`flex flex-col justify-between absolute top-20 left-20 ${
            data.track?.startsWith("[CLS]") ? "w-full" : "w-[1320px]"
          }`}
        >
          <img src={`${url}/dc7/logo.png`} tw="w-96 mb-12" />

          <div tw="flex flex-col justify-center h-80 mb-4 overflow-hidden">
            <span
              tw={`text-[#36364C] leading-tight font-medium`}
              style={{
                display: "-webkit-box",
                WebkitLineClamp: "3",
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                fontSize:
                  data.title.length > 100
                    ? "82px"
                    : data.title.length > 50
                    ? "92px"
                    : "102px",
                lineHeight:
                  data.title.length > 100
                    ? "1.1em"
                    : data.title.length > 50
                    ? "1.15em"
                    : "1.2em",
                maxHeight:
                  data.title.length > 100
                    ? "3.3em"
                    : data.title.length > 50
                    ? "3.45em"
                    : "3.6em",
                textOverflow: "ellipsis",
              }}
            >
              {data.title}
            </span>
          </div>
          <div tw="flex">
            <span
              tw={`text-[#5B5F84] font-medium mt-4 ${getSpeakerClass(
                data.speakers,
                true
              )}`}
              style={{
                display: "-webkit-box",
                WebkitLineClamp: "2",
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                fontSize:
                  data.speakers.map((i: any) => i.name).join(", ").length > 80
                    ? "40px"
                    : data.speakers.map((i: any) => i.name).join(", ").length >
                      40
                    ? "56px"
                    : "72px",
                lineHeight: "1.2em",
                maxHeight: "2.4em", // 2 lines * 1.2em line height
                textOverflow: "ellipsis",
              }}
            >
              {data.speakers.map((i: any) => i.name).join(", ")}
            </span>
          </div>
        </div>

        <div tw="flex flex-col justify-between absolute top-20 right-20">
          <div tw="flex flex-col text-4xl justify-end items-end">
            <span tw="font-bold uppercase text-[#5B5F84]">
              Bangkok, Thailand
            </span>
            <span tw="mt-2">
              <span tw="text-[#6B54AB] mr-4">12 — 15</span>Nov, 2024
            </span>
          </div>
        </div>
      </div>
    ),
    {
      width: 1920,
      height: 1080,
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
