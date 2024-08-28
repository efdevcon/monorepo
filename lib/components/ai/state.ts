import { atom } from "recoil";

export const visibleState = atom<boolean>({
  key: "visibleState",
  default: false,
});

export const queryState = atom<string>({
  key: "queryState",
  default: "",
});

export const executingQueryState = atom<boolean>({
  key: "executingQueryState",
  default: false,
});

export const errorState = atom<string>({
  key: "errorState",
  default: "",
});

export const threadIDState = atom<string>({
  key: "threadIDState",
  default: "",
});

export const messagesState = atom<any[]>({
  key: "messagesState",
  default: [],
});
