import React from "react";
import { PlaylistSlider } from "./PlaylistSlider";
import { getFeaturedSessions } from "@/services/devcon";

interface Props {
  title: string;
  type: "most-popular" | "devcon-6" | "devcon-7" | "devcon-7-opening";
}

export async function FeaturedList(props: Props) {
  const sessions = await getFeaturedSessions(props.type);
  if (!sessions) return null;

  return (
    <PlaylistSlider
      title={props.title}
      playlist={{
        id: props.type,
        title: props.title,
        description: "Hand-picked videos from the Devcon team",
        curators: ["Devcon Team"],
        categories: [],
        profiles: [],
        videos: sessions,
      }}
    />
  );
}
