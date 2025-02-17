import { Template } from 'tinacms'
// @ts-ignore
import { button, createRichText } from '../../../lib/cms/presets'

const pastEditions: Template = {
  name: 'past_editions',
  label: 'past_editions',
  fields: [
    createRichText('amsterdam'),
    createRichText('istanbul'),
    createRichText('istanbul_catch_the_vibe'),
    createRichText('istanbul_watch_the_presentations'),
  ],
}

export default pastEditions
