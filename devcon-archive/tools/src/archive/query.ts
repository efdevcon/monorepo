import { SearchIndexClient } from '../../../src/server/services/search-client'
require('dotenv').config()

// GetArchiveIndex()
QueryArchiveIndex() 

async function GetArchiveIndex() { 
    const client = new SearchIndexClient()
    const results = await client.getIndexes('archive')
    console.log('RESULTS', results)
}

async function QueryArchiveIndex() {
    let params: any = {
        sort: 'title', // title
        order: 'asc',
        from: 0,
        size: 5
    }

    const input: any = {
        // expertise: 'beginner',
        // tags: 'Security'
    }

    const query = new Array<string>();
    Object.keys(input).forEach(i => {
        if (typeof input[i] === 'string') {
            query.push('(' + i + ':' + input[i] + ')')
        }
    })

    const searchQuery = 'austin'
    if (searchQuery) {
        query.push(`(title:*${searchQuery}* OR speakers:*${searchQuery}* OR description:*${searchQuery}*)`)
    }
    
    const queryString = query.length ? query.join(' AND ') : "*"
    const client = new SearchIndexClient()
    console.log('QUERY ElasticSearch', query)
    console.log('QueryString:', queryString)

    const results = await client.searchIndex('archive', queryString, params)
    console.log('RESULTS', results.items)
}
