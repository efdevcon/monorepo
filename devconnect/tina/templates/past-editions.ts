import { Template } from 'tinacms'
// @ts-ignore
import { button, createRichText } from '../../../lib/cms/presets'

const pastEditions: Template = {
  name: 'past_editions',
  label: 'past_editions',
  fields: [
    createRichText('istanbul'),
    createRichText('amsterdam'),
  ],
}

export default pastEditions
