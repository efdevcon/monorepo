import { Template } from 'tinacms'
import { button, createRichText } from '../presets'

const supporters: Template = {
  name: 'supporters',
  label: 'supporters',
  fields: [
    {
      label: 'placeholder_one',
      name: 'placeholder_one',
      type: 'object',
      fields: [createRichText('body')],
    },
  ],
}

export default supporters
