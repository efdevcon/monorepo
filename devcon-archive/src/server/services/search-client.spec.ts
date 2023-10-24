import { SearchIndexClient } from './search-client'

test('Init search index client', () => {
  const client = new SearchIndexClient()

  expect(client).not.toBeNull()
})

test('Create "test" index', async () => {
  const client = new SearchIndexClient()

  await client.createIndex('test-index')
})

test('Try and create the same "test" index twice', async () => {
  const client = new SearchIndexClient()

  await client.createIndex('test-index')
  await client.createIndex('test-index')
})

test('Try delete not-existing index', async () => {
  const client = new SearchIndexClient()

  await client.deleteIndex('not-existing-index')
})

test('Delete created "test" indexes', async () => {
  const client = new SearchIndexClient()

  await client.deleteIndex('test')
  await client.deleteIndex('test-index')
  await client.deleteIndex('not-existing-index')
})

test('Index doc to not-existing index', async () => {
  const client = new SearchIndexClient()

  await client.addToIndex('not-existing-index', { test: 'document' })
})

test('Create "create-and-index" and add test document', async () => {
  const client = new SearchIndexClient()
  const indexName = 'create-and-index'

  await client.createIndex(indexName)
  await client.addToIndex(indexName, { test: 'document' })
})

test('Delete "create-and-index" with test document', async () => {
  const client = new SearchIndexClient()
  const indexName = 'create-and-index'

  await client.deleteIndex(indexName)
})

test('Get all indexes', async () => {
  const client = new SearchIndexClient()
  const indexName = '*'

  const results = await client.getIndexes(indexName)
  expect(results.length).toBeGreaterThan(0)
})

test('Get archive index', async () => {
  const client = new SearchIndexClient()
  const indexName = 'archive'

  const results = await client.getIndexes(indexName)
  expect(results.length).toBeGreaterThan(0)
})

test('Create "game-of-thrones", index and query', async () => {
  const client = new SearchIndexClient()
  const indexName = 'game-of-thrones'

  await client.deleteIndex(indexName)
  await client.createIndex(indexName)
  await client.addToIndex(indexName, { name: 'Ned Stark' }, true)
  await client.addToIndex(indexName, { name: 'Jon Snow' }, true)
  await client.addToIndex(indexName, { name: 'Daenerys Targaryen' }, true)
  await client.addToIndex(indexName, { name: 'Tyrion Lannister' }, true)

  const results = await client.searchIndex<any>(indexName, 'name:snow')
  expect(results.items).toHaveLength(1)
  await client.deleteIndex(indexName)
})

test('Delete "game-of-thrones" index', async () => {
  const client = new SearchIndexClient()
  const indexName = 'game-of-thrones'

  await client.deleteIndex(indexName)
})

test('Create index and search with sort order', async () => {
  const client = new SearchIndexClient()
  const indexName = 'ordered'

  await client.deleteIndex(indexName)
  await client.createIndex(indexName)

  await client.addToIndex(indexName, { name: '10', length: 10, step: 1 }, true)
  await client.addToIndex(indexName, { name: '100', length: 100, step: 2 }, true)
  await client.addToIndex(indexName, { name: '1000', length: 1000, step: 3 }, true)
  await client.addToIndex(indexName, { name: '10000', length: 10000, step: 4 }, true)

  const sort1 = await client.searchIndex<any>(indexName, '*', { from: 0, size: 1, sort: 'length', order: 'asc' })
  const sort2 = await client.searchIndex<any>(indexName, '*', { from: 0, size: 1, sort: 'length', order: 'desc' })

  expect(sort1.items).toHaveLength(1)
  expect(sort2.items).toHaveLength(1)

  await client.deleteIndex(indexName)
})

test('Create index and search with pagination', async () => {
  const client = new SearchIndexClient()
  const indexName = 'ordered'

  await client.deleteIndex(indexName)
  await client.createIndex(indexName)

  await client.addToIndex(indexName, { name: '10', length: 10, step: 1 }, true)
  await client.addToIndex(indexName, { name: '100', length: 100, step: 2 }, true)
  await client.addToIndex(indexName, { name: '1000', length: 1000, step: 3 }, true)
  await client.addToIndex(indexName, { name: '10000', length: 10000, step: 4 }, true)

  const allResults = await client.searchIndex<any>(indexName, '*')
  expect(allResults.items).toHaveLength(4)

  const firstPage = await client.searchIndex<any>(indexName, '*', { from: 0, size: 1 })
  expect(firstPage.items).toHaveLength(1)

  const secondPage = await client.searchIndex<any>(indexName, '*', { from: 1, size: 1 })
  expect(secondPage.items).toHaveLength(1)
  expect(firstPage).not.toBe(secondPage)

  await client.deleteIndex(indexName)
})
