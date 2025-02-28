export const useArchiveSearch = (qs: string, params?: any): any => {
  const defaultData = { total: 0, currentPage: 0, items: [] };
  let uri = `https://api.devcon.org/sessions${qs}`;
  if (!qs) uri += "?";
  if (params?.q) uri += `&q=${params.q}`;
  if (params?.from) uri += `&from=${params.from}`;
  if (params?.size) uri += `&size=${params.size}`;
  if (params?.sort) uri += `&sort=${params.sort}`;
  if (params?.order) uri += `&order=${params.order}`;
  if (!uri.includes("event="))
    uri += `&event=devcon-6&event=devcon-5&event=devcon-4&event=devcon-3&event=devcon-2&event=devcon-1&event=devcon-0`;

  return {
    isLoading: false,
    isError: false,
    data: {
      total: 0,
      currentPage: 0,
      items: [],
    },
  };
};
