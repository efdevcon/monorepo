import { normalizeRepoRef, parseRepoList } from '../../services/builder/repo-ref'
import { assertEqual } from './_assert'

assertEqual(normalizeRepoRef('https://github.com/Facebook/React'), 'facebook/react', 'https url')
assertEqual(normalizeRepoRef('github.com/ethereum/go-ethereum'), 'ethereum/go-ethereum', 'bare host')
assertEqual(normalizeRepoRef('Owner/Name'), 'owner/name', 'owner/name')
assertEqual(normalizeRepoRef('https://github.com/a/b/'), 'a/b', 'trailing slash')
assertEqual(normalizeRepoRef('https://github.com/a/b/tree/main'), 'a/b', 'deep path')
assertEqual(normalizeRepoRef('not a repo'), null, 'garbage')
assertEqual(normalizeRepoRef(''), null, 'empty')
assertEqual(parseRepoList('a/b, c/d\nhttps://github.com/E/F'), ['a/b', 'c/d', 'e/f'], 'mixed list')
assertEqual(parseRepoList('a/b\na/b'), ['a/b'], 'dedupe')

console.log('ALL PASS')
