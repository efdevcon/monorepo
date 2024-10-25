import csv from 'csv-parser'
import { Readable } from 'stream'

export async function parseCSV(data: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const results: any[] = []
    const readableStream = Readable.from(data)

    readableStream
      .pipe(csv())
      .on('data', (row) => results.push(row))
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error))
  })
}
