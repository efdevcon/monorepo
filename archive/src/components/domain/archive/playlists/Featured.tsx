import React from "react";
import { PlaylistSlider } from "./PlaylistSlider";
import { getFeaturedSessions, type FeaturedListType } from "@/services/devcon";

interface Props {
  title: string;
  type: FeaturedListType;
}

export async function FeaturedList(props: Props) {
  const sessions = await getFeaturedSessions(props.type);
  // No row at all while a list is empty (Devcon 8 before its recordings land).
  if (!sessions?.length) return null;

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
