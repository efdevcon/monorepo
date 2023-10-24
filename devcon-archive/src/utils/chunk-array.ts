export const chunkArray = (array: Array<any>, nChunks: number): Array<Array<any>> => {
  const results = []
  const size = Math.ceil(array.length / nChunks)
  let i = 0

  while (i < array.length) results.push(array.slice(i, (i += size)))

  return results
}
