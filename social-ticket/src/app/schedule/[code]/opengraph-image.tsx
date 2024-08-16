import { ImageResponse } from 'next/og'

// Route segment config
export const runtime = 'edge'

// Image metadata
export const alt = 'Devcon Tickets'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({ params }: { params: { code: string } }) {
  const url = process.env.SITE_URL || "http://localhost:3000";
  const res = await fetch(`https://cfp.ticketh.xyz/api/events/devcon7-sea/talks/${params.code}`, {
    headers: {
      Authorization: `Token ${process.env.PRETALX_API_KEY}`,
    },
  })
  
  const data = await res.json()
  let type = 'talk'
  if (data.submission_type_id === 36) type = 'lightning talk'
  if (data.submission_type_id === 32) type = 'talk'
  if (data.submission_type_id === 41) type = 'panel'
  if (data.submission_type_id === 33 || data.submission_type_id === 34 || data.submission_type_id === 40)
    type = 'workshop'

  const track = data.track.en
  let trackImage = 'RealWorldEthereum.png'
  if (track === 'Core Protocol') trackImage = 'CoreProtocol.png'
  if (track === 'Cypherpunk & Privacy') trackImage = 'Cypherpunk.png'
  if (track === 'Usability') trackImage = 'Usability.png'
  if (track === 'Real World Ethereum') trackImage = 'RealWorldEthereum.png'
  if (track === 'Applied Cryptography') trackImage = 'AppliedCryptography.png'
  if (track === 'Cryptoeconomics') trackImage = 'CryptoEconomics.png'
  if (track === 'Coordination') trackImage = 'Coordination.png'
  if (track === 'Developer Experience') trackImage = 'DeveloperExperience.png'
  if (track === 'Security') trackImage = 'Security.png'
  if (track === 'Layer 2') trackImage = 'Layer2.png'
  
  let titleSize = data.title.length > 100 ? 'text-3xl' : 'text-5xl'
  return new ImageResponse(
    (
      <div tw="flex justify-between bg-[#36364c] text-black w-full h-full p-8">
        <div tw="flex flex-row justify-between rounded-3xl bg-[#f8f9fe] border-[#ff0000] shadow-xl w-full h-full p-12">
          <div tw="flex absolute left-1/2 top-0 bottom-0 right-0">
            <img src={`${url}/dc7/prism.png`} tw="h-full" />
          </div>
          <div tw="flex absolute bottom-2 right-2">
            <img src={`${url}/programming/${trackImage}`} tw="h-[24rem]" />
          </div>

          <div tw="flex flex-col justify-between w-3/5">
            <img src={`${url}/dc7/logo.png`} tw="w-60" />

            <div tw="flex flex-col justify-between mb-12">
              <span tw={`text-[#36364C] mt-8 h-40 ${titleSize}`}>{data.title}</span>
            </div>
            <div tw="flex w-full my-8" style={{ borderTop: "3px dashed #cfd4eb" }}>&nbsp;</div>
            <div tw='flex flex-col'>
              <span tw='text-[#5B5F84] text-2xl mb-2'>{data.speakers.map((i: any) => i.name).join(', ')}</span>
              <span tw="text-2xl font-bold">{track}</span>
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
  )
}
