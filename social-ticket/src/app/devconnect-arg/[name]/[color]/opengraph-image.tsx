import { ImageResponse } from "next/og";
import { Ticket } from "../../../../../../lib/components/ticket";

// Route segment config
export const runtime = "edge";

// Image metadata
export const alt = "Devconnect ARG Tickets";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: { name: string; color: string };
}) {
  const name = params.name || "Anon";
  const color = params.color || "blue";
  return new ImageResponse(<Ticket name={name} color={color} />, {
    ...size,
  });
}
