import { ArchiveVideo } from 'types/ArchiveVideo'
import { FetchedResult } from 'types/FetchedResult'
import { PagedResult } from 'types/PagedResult'
import { usePagedSearch } from './usePagedSearch'

export const useArchiveSearch = (qs: string, params?: any): FetchedResult<PagedResult<ArchiveVideo>> => {
  let uri = `/api/archive/search${qs}`
  if (!qs) uri += '?'
  if (params?.q) uri += `&q=${params.q}`
  if (params?.from) uri += `&from=${params.from}`
  if (params?.size) uri += `&size=${params.size}`
  if (params?.sort) uri += `&sort=${params.sort}`
  if (params?.order) uri += `&order=${params.order}`

  return usePagedSearch(uri)
}
