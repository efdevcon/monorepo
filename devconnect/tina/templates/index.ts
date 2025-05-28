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
      type: 'string',
      name: 'button',
      label: 'Button text',
    },
    createRichText('what_is_devconnect'),
    createRichText('buenos_aires'),
    createRichText('how_to_contribute'),
    createRichText('event_calendar'),
    // createRichText('what_to_expect'),
    {
      label: 'what_to_expect',
      name: 'what_to_expect',
      list: true,
      type: 'object',
      fields: [
        { label: 'title', name: 'title', type: 'string' },
        { label: 'description', name: 'description', type: 'string' },
      ],
    },
    {
      type: 'object',
      name: 'devconnect_week',
      label: 'Devconnect Week',
      fields: [createRichText('first_part'), createRichText('second_part')],
    },
    createRichText('devcon_vs_devconnect'),
    {
      type: 'string',
      name: 'devconnect_themes',
      label: 'Devconnect Themes',
      list: true,
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
