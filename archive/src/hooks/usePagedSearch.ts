import React from 'react'
import useSWR from 'swr'
import { FetchedResult } from '../types/FetchedResult'

const fetcher = async (url: string) => {
  const response = await fetch(url)
  const result = await response.json()
  const acceptedStatus = [200, 304]

  if (!acceptedStatus.includes(response.status)) {
    throw new Error(result.message)
  }

  return result.data
}

export const usePagedSearch = <T>(uri: string): FetchedResult<T> => {
  const [data, setData] = React.useState()
  const { error, isValidating } = useSWR(uri, fetcher, {
    onSuccess: data => {
      setData(data)
    },
    onError: () => {
      setData(undefined)
    },
    revalidateOnFocus: false
  })

  // if (error) {
  //   console.error('ERROR:', error)
  //   console.log('Unable to fetch paged result', uri)
  // }

  return {
    isLoading: !error && isValidating,
    isError: !!error,
    data,
  }
}
