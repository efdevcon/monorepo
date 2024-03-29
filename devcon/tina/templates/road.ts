import { Template } from 'tinacms'
import { createRichText } from '../presets'

const road_to_devcon: Template = {
  name: 'road_to_devcon',
  label: 'road_to_devcon',
  fields: [
    {
      label: 'journey',
      name: 'journey',
      type: 'object',
      fields: [
        createRichText('section_one', { required: true }),
        createRichText('section_two', { required: true }),
        createRichText('section_three', { required: true }),
        createRichText('section_four', { required: true }),
      ],
    },
    createRichText('events_table')
  ],
}

export default road_to_devcon
