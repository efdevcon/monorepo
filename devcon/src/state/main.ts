import { atom } from "recoil";

export const appState = atom({
    key: "appState",
    default: {
        devabotVisible: false as boolean, 
    },
});