import { useQuery } from "@tanstack/react-query";
import { FilterParams } from "@/types/filter";

export const useArchiveSearch = (qs: string, params?: FilterParams) => {
  let uri = `https://api.devcon.org/sessions${qs}`;
  if (!qs) uri += "?";
  if (params?.q) uri += `&q=${params.q}`;
  if (params?.from) uri += `&from=${params.from}`;
  if (params?.size) uri += `&size=${params.size}`;
  if (params?.sort) uri += `&sort=${params.sort}`;
  if (params?.order) uri += `&order=${params.order}`;
  if (!uri.includes("event="))
    uri += `&event=devcon-7&event=devcon-6&event=devcon-5&event=devcon-4&event=devcon-3&event=devcon-2&event=devcon-1&event=devcon-0`;

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
