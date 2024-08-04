import { Playlist } from "@/types";
import { slugify } from "@/utils/format";
import fs from "fs";
import path from "path";

interface Params {
  category?: string;
  curator?: string;
}

// Examples
// - getPlaylists({ category: "Community Curated" })
// - getPlaylists({ curator: "Devcon Team" })
export function getPlaylists(params?: Params) {
  const dir = path.join(process.cwd(), "src", "data", "playlists");
  const files = fs.readdirSync(dir);

  let playlists: Playlist[] = [];
  files.forEach((file) => {
    if (path.extname(file) === ".json") {
      const filePath = path.join(dir, file);
      const fileContent = fs.readFileSync(filePath, "utf-8");
      const playlist: Playlist = {
        id: path.basename(file, ".json"),
        ...JSON.parse(fileContent),
      };
      playlists.push(playlist);
    }
  });

  if (params?.category) {
    playlists = playlists.filter((p) =>
      p.categories
        .map((i) => slugify(i))
        .includes(slugify(params.category as string))
    );
  }

  if (params?.curator) {
    playlists = playlists.filter((p) =>
      p.curators
        .map((i) => slugify(i))
        .includes(slugify(params.curator as string))
    );
  }

  return playlists;
}

export function getPlaylist(id: string) {
  return getPlaylists().find((i) => slugify(i.id) === slugify(id));
}
