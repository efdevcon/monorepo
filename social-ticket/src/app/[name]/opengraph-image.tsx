import { ImageResponse } from 'next/og'

// Route segment config
export const runtime = 'edge'

// Image metadata
export const alt = 'Devcon Tickets'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({ params }: { params: { name: string } }) {
  const name = params.name || "Anon";
  const url = process.env.SITE_URL || "http://localhost:3000";

  const heroes = ["Aria.png", "Cat.png", "Doggo.png", "Deva.png", "Lyra.png"];
  const firstLetter = name[0].toUpperCase();
  const alphabetIndex = firstLetter.charCodeAt(0) - "A".charCodeAt(0);
  const heroIndex = alphabetIndex % heroes.length;
  const selectedHero = heroes[heroIndex];
  console.log("Render Ticket", name, "|", selectedHero);
  
  return new ImageResponse(
    (
      <div tw="flex justify-between bg-[#36364c] text-black  w-full h-full p-8">
        <div tw="flex flex-row justify-between rounded-3xl bg-[#f8f9fe] border-[#ff0000] shadow-xl w-full h-full p-12">
          <div tw="flex absolute left-1/2 top-0 bottom-0 right-0">
            <img src={`${url}/dc7/prism.png`} tw="h-full" />
          </div>
          <div
            tw="flex absolute mt-12 right-100 h-full"
            style={{ borderLeft: "4px dashed #cfd4eb" }}
          >
            &nbsp;
          </div>
          <div tw="flex absolute bottom-0 right-0">
            <img src={`${url}/dc7/${selectedHero}`} tw="w-[22rem]" />
          </div>
          <div tw="flex absolute top-1/2 -left-8 w-14 h-14 bg-[#36364c] rounded-full"></div>
          <div tw="flex absolute top-1/2 -right-8 w-14 h-14 bg-[#36364c] rounded-full"></div>

          <div tw="flex flex-col justify-between w-1/2">
            <img src={`${url}/dc7/logo.png`} tw="w-60" />

            <div tw="flex flex-col justify-between mb-12">
              <span tw="text-[#36364C] text-7xl">{name}</span>
              <span tw='text-[#5B5F84] text-2xl mt-4'>Attending Devcon: the schelling point for the Ethereum community</span>
            </div>

            <span tw="text-2xl font-bold uppercase">Devcon.org</span>
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
  )
}
