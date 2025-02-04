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
    createRichText('what_is_devconnect'),
    createRichText('buenos_aires'),
    createRichText('what_to_expect'),
    {
      type: 'string',
      name: 'devconnect_themes',
      label: 'Devconnect Themes',
      list: true
    },
    createRichText('catch_the_vibe'),
    createRichText('watch_the_presentations'),
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
