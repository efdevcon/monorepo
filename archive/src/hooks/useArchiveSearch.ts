import { useQuery } from "@tanstack/react-query";
import { FilterParams } from "@/types/filter";
import { CONFIG } from "@/utils/config";
import { EDITION_EVENT_IDS } from "@/utils/editions";

export const useArchiveSearch = (qs: string, params?: FilterParams) => {
  let uri = `${CONFIG.API_BASE_URL}/sessions${qs}`;
  if (!qs) uri += "?";
  if (params?.q) uri += `&q=${params.q}`;
  if (params?.from) uri += `&from=${params.from}`;
  if (params?.size) uri += `&size=${params.size}`;
  if (params?.sort) uri += `&sort=${params.sort}`;
  if (params?.order) uri += `&order=${params.order}`;
  if (!uri.includes("event="))
    uri +=
      EDITION_EVENT_IDS.map((id) => `&event=${id}`).join("") +
      "&event=devconnect-arg";
  // Recorded sessions only: Devcon 8 talks appear as their videos are published.
  uri += "&video=true";

  return useQuery({
    queryKey: ["search", uri],
    queryFn: async () => {
      const response = await fetch(uri);
      if (!response.ok) {
        throw new Error("Failed to fetch archive data");
      }

      const body = await response.json();
      return body.data;
    },
  });
};
