import { Client } from '@elastic/elasticsearch'
import { PagedResult } from '../../types/PagedResult'
import { SERVER_CONFIG } from '../config/server'
require('dotenv').config()

export interface SearchIndexClientInterface {
  createIndex(name: string): void
  searchIndex<T>(index: string, query: string, params?: SearchParams): Promise<PagedResult<T>>
  getIndexes(name: string): Promise<any[]>
  addToIndex<T>(index: string, doc: T, refresh: boolean): void
  deleteIndex(name: string): void
}

export interface SearchParams {
  q?: string
  sort?: string
  order?: 'asc' | 'desc'
  from?: number
  size?: number
}

const DEFAULT_ORDER = 'desc'

export class SearchIndexClient implements SearchIndexClientInterface {
  private elasticClient: any

  constructor() {
    this.elasticClient = new Client({ node: SERVER_CONFIG.ELASTIC_ENDPOINT })
  }

  async createIndex(name: string) {
    const exists = await this.elasticClient.indices.exists({ index: name })
    if (exists.body) {
      console.log(`Index ${name} already exists..`)
      return
    }

    await this.elasticClient.indices.create({ index: name })
  }

  async searchIndex<T>(index: string, query: string, params?: SearchParams): Promise<PagedResult<T>> {
    const exists = await this.elasticClient.indices.exists({ index: index })
    if (!exists.body) {
      console.log(`Index ${index} doesn't exists..`)
      return {
        total: 0,
        currentPage: 0,
        items: new Array<T>(),
      }
    }

    let searchQuery: any = {
      index: index,
      body: {
        query: {
          query_string: {
            query: query,
          },
        },
      },
    }

    if (params?.from) searchQuery.from = params?.from
    if (params?.size) searchQuery.size = params?.size
    if (params?.sort)
      searchQuery.body.sort = [
        { [params?.sort === 'title' ? 'title.raw' : params?.sort]: params.order || DEFAULT_ORDER },
        '_score',
      ]
    console.log('Searching Elastic index', index, query, params)
    const result = await this.elasticClient.search(searchQuery)

    if (result.statusCode !== 200) {
      console.log(`Search query '${query}' on ${index} index failed..`)
      return {
        total: 0,
        currentPage: 0,
        items: new Array<T>(),
      }
    }

    const items = result.body.hits.hits.map((i: any) => i._source)
    const currentPage = !!params?.from && params?.size ? Math.ceil((params.from + 1) / params.size) : 1

    return {
      total: result.body.hits.total.value,
      currentPage: currentPage,
      items: items,
    }
  }

  async getIndexes(name: string): Promise<any[]> {
    const result = await this.elasticClient.indices.get({ index: name })
    if (result.statusCode !== 200) {
      console.log(`Unable to get indices '${name}'..`)
      return []
    }

    // console.log('MAPPINGS', result.body.archive.mappings)

    return Object.keys(result.body)
  }

  async updateMapping(index: string, body: any): Promise<boolean> {
    console.log('Updating mapping for index', index, body)
    const result = await this.elasticClient.indices.putMapping({
      index: index,
      body: body,
    })

    return result.statusCode === 200
  }

  async addToIndex<T>(index: string, body: T, refresh: boolean = false) {
    const exists = await this.elasticClient.indices.exists({ index: index })
    if (!exists.body) {
      console.log(`Index ${index} doesn't exists..`)
      return
    }

    await this.elasticClient.index({
      index: index,
      refresh: refresh,
      body: body,
    })
  }

  async deleteIndex(name: string) {
    const exists = await this.elasticClient.indices.exists({ index: name })
    if (!exists.body) {
      console.log(`Index ${name} doesn't exists..`)
      return
    }

    await this.elasticClient.indices.delete({ index: name })
  }
}
