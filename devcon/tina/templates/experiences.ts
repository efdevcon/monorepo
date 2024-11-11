import { Template } from 'tinacms'
import { createRichText } from '../presets'

const Experiences: Template = {
  name: 'experiences',
  label: 'experiences',
  fields: [
    createRichText('intro'),
    createRichText('community_hubs'),
    createRichText('discussion_corners'),
    {
      label: 'hubs_list',
      name: 'hubs_list',
      list: true,
      type: 'object',
      fields: [
        { label: 'title', name: 'title', type: 'string' },
        createRichText('description'),
        { label: 'location', name: 'location', type: 'string' },
        { label: 'url', name: 'url', type: 'string' },
      ],
    },
    {
      label: 'spaces',
      name: 'spaces',
      list: true,
      type: 'object',
      fields: [{ label: 'title', name: 'title', type: 'string' }, createRichText('description')],
    },
    createRichText('hacker_cave'),
    createRichText('dips'),
    createRichText('music_and_art'),
    createRichText('treasure_hunt'),
  ],
}

export default Experiences
