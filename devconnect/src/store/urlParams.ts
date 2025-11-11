import { create } from 'zustand'

interface UrlParamsStore {
  mtm_campaign?: string
  mtm_kwd?: string
  mtm_content?: string
  setUtmParams: (params: { mtm_campaign?: string; mtm_kwd?: string; mtm_content?: string }) => void
}

export const useUrlParamsStore = create<UrlParamsStore>((set) => ({
  mtm_campaign: undefined,
  mtm_kwd: undefined,
  mtm_content: undefined,
  setUtmParams: (params) => set(params),
}))

