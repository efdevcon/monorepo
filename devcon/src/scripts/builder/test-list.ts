import { lookupRepo } from '../../services/builder/list'
import { assertEqual } from './_assert'

// web2 entry
const react = lookupRepo('facebook/react')
assertEqual(react?.project, 'Facebook Open Source', 'react project')
assertEqual(react?.list, 'web2', 'react list')
assertEqual(typeof react?.stars === 'number', true, 'react stars is number')

// case-insensitive
assertEqual(lookupRepo('Facebook/React')?.project, 'Facebook Open Source', 'case-insensitive')

// web3 entry carries ecosystems
const baseNode = lookupRepo('base/node')
assertEqual(baseNode?.list, 'web3', 'base/node list')
assertEqual(Array.isArray(baseNode?.ecosystems), true, 'base/node ecosystems array')

// miss
assertEqual(lookupRepo('nope/nope'), null, 'miss')

console.log('ALL PASS')
