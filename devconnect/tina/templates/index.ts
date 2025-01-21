import { Template } from 'tinacms'
// @ts-ignore
import { button, createRichText } from '../../../lib/cms/presets'

const index: Template = {
  name: 'index',
  label: 'index',
  fields: [
    {
      type: 'string',
      name: 'catchphrase',
      label: 'Catchphrase',
    },
    {
      type: 'rich-text',
      name: 'subtext',
      label: 'Subtext',
    },
    {
      type: "string",
      name: "button",
      label: "Button text",
    },
    {
      label: 'faq',
      name: 'faq',
      list: true,
      type: 'object',
      fields: [{ label: 'question', name: 'question', type: 'string' }, createRichText('answer')],
    },
  ],
}

export default index
