import { ImageResponse } from "next/og";

// Route segment config
export const runtime = "edge";

// Image metadata
export const alt = "Devcon Schedule";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: { code: string } }) {
  const url = process.env.SITE_URL || "http://localhost:3000";
  const res = await fetch(
    `https://cfp.ticketh.xyz/api/events/devcon7-sea/talks/${params.code.toUpperCase()}`,
    {
      headers: {
        Authorization: `Token ${process.env.PRETALX_API_KEY}`,
      },
    }
  );

  const data = await res.json();
  let type = "Talk";
  // if (data.submission_type_id === 51) type = "spotlight";
  if (data.submission_type_id === 38) type = "Music";
  if (data.submission_type_id === 36) type = "Lightning talk";
  if (data.submission_type_id === 32) type = "Talk";
  if (data.submission_type_id === 41) type = "Panel";
  if (
    data.submission_type_id === 33 ||
    data.submission_type_id === 34 ||
    data.submission_type_id === 40
  )
    type = "Workshop";

  const track = data.track.en;
  let cardTw = `flex flex-row relative justify-between rounded-3xl border-[#ff0000] shadow-xl w-full h-full p-12`;
  let trackImage = "RealWorldEthereum.png";
  if (track === "Core Protocol") {
    trackImage = "CoreProtocol.png";
    cardTw += " bg-[#F6F2FF]";
  } else if (track === "Cypherpunk & Privacy") {
    trackImage = "Cypherpunk.png";
    cardTw += " bg-[#FFF4FF]";
  } else if (track === "Usability") {
    trackImage = "Usability.png";
    cardTw += " bg-[#FFF4F4]";
  } else if (track === "Real World Ethereum") {
    trackImage = "RealWorldEthereum.png";
    cardTw += " bg-[#FFEDDF]";
  } else if (track === "Applied Cryptography") {
    trackImage = "AppliedCryptography.png";
    cardTw += " bg-[#FFFEF4]";
  } else if (track === "Cryptoeconomics") {
    trackImage = "CryptoEconomics.png";
    cardTw += " bg-[#F9FFDF]";
  } else if (track === "Coordination") {
    trackImage = "Coordination.png";
    cardTw += " bg-[#E9FFD7]";
  } else if (track === "Developer Experience") {
    trackImage = "DeveloperExperience.png";
    cardTw += " bg-[#E8FDFF]";
  } else if (track === "Security") {
    trackImage = "Security.png";
    cardTw += " bg-[#E4EEFF]";
  } else if (track === "Layer 2") {
    trackImage = "Layer2.png";
    cardTw += " bg-[#F0F1FF]";
  } else {
    trackImage = "AppliedCryptography.png";
    cardTw += " bg-[#f8f9fe]";
  }

  let titleSize = "text-5xl";
  if (data.title.length > 65) titleSize = "text-4xl";
  if (data.title.length > 100) titleSize = "text-3xl";

  return new ImageResponse(
    (
      <div tw="flex justify-between bg-[#36364c] text-black w-full h-full overflow-hidden p-4">
        <div tw={cardTw}>
          <div tw="flex absolute left-1/2 top-0 bottom-0 right-0">
            <img src={`${url}/dc7/prism.png`} tw="h-full opacity-80" />
          </div>
          <div tw="flex absolute bottom-0 right-0">
            <img src={`${url}/programming/${trackImage}`} tw="h-[27rem]" />
          </div>

          <div tw="flex flex-col justify-between w-3/5">
            <img src={`${url}/dc7/logo.png`} tw="w-60" />

            <div tw="flex flex-col justify-between mb-12">
              <span tw={`text-[#36364C] leading-snug mt-8 h-40 ${titleSize}`}>
                {data.title}
              </span>
            </div>
            <div
              tw="flex w-full my-8"
              style={{ borderTop: "3px dashed #cfd4eb" }}
            >
              &nbsp;
            </div>
            <div tw="flex flex-col">
              <span tw="text-[#5B5F84] text-2xl mb-2">
                {data.speakers.map((i: any) => i.name).join(", ")}
              </span>
              <div tw="flex flex-row">
                <span tw="text-2xl font-bold">{type}</span>
                <span tw="text-[#6B54AB] text-2xl mx-4">•</span>
                <span tw="text-2xl font-bold">{track}</span>
              </div>
            </div>
          </div>

          <div tw="flex flex-col">
            <div tw="flex flex-col text-2xl">
              <span tw="font-bold uppercase text-[#5B5F84]">
                Bangkok, Thailand
              </span>
              <span tw="">
                <span tw="text-[#6B54AB] mr-2">12 — 15</span>Nov, 2024
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  );
}
