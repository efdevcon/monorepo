import { ImageResponse } from "next/og";

// Route segment config
export const runtime = "edge";

// Image metadata
export const alt = "Devcon Schedule";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: { id: string } }) {
  const inter = await fetch(
    new URL("../../../assets/Inter-Regular.ttf", import.meta.url)
  ).then((res) => res.arrayBuffer());

  const interMedium = await fetch(
    new URL("../../../assets/Inter-Medium.ttf", import.meta.url)
  ).then((res) => res.arrayBuffer());

  const interBold = await fetch(
    new URL("../../../assets/Inter-Bold.ttf", import.meta.url)
  ).then((res) => res.arrayBuffer());

  const url = process.env.SITE_URL || "http://localhost:3000";
  const apiUrl = process.env.API_URL || "http://localhost:4000";
  const res = await fetch(`${apiUrl}/account/${params.id}/schedule`);
  const { user } = await res.json();

  return new ImageResponse(
    (
      <div
        tw="flex flex-col text-white w-full h-full overflow-hidden"
        style={{
          backgroundImage: `url(${url}/dc7/personalized.png)`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div tw="flex flex-col justify-center absolute top-32 left-10 h-[200px] max-w-[525px]">
          <p tw="text-6xl" style={{ fontFamily: "Inter" }}>
            wslyvh.eth
          </p>
        </div>
        <img
          src={user.avatar}
          alt={user.username}
          tw="rounded-full absolute top-23 right-32"
          width={225}
          height={225}
        />
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
