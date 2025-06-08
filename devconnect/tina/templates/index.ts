import { Template } from 'tinacms'
// @ts-ignore
import { button, createRichText } from '../../../lib/cms/presets'

const index: Template = {
  name: 'index',
  label: 'index',
  fields: [
    {
      label: 'what_is_devconnect',
      name: 'what_is_devconnect',
      type: 'string',
    },
    {
      label: 'why_join_devconnect_arg_title',
      name: 'why_join_devconnect_arg_title',
      type: 'string',
    },
    {
      label: 'why_join_devconnect_arg_list',
      name: 'why_join_devconnect_arg_list',
      list: true,
      type: 'object',
      fields: [
        { label: 'title', name: 'title', type: 'string' },
        { label: 'description', name: 'description', type: 'string' },
      ],
    },
    createRichText('ethereum_worlds_fair'),
    {
      label: 'ethereum_worlds_fair_list',
      name: 'ethereum_worlds_fair_list',
      list: true,
      type: 'object',
      fields: [
        { label: 'title', name: 'title', type: 'string' },
        { label: 'description', name: 'description', type: 'string' },
      ],
    },
    createRichText('how_to_contribute'),
    {
      name: 'contribute_and_support_list',
      label: 'contribute_and_support_list',
      list: true,
      type: 'object',
      fields: [
        { label: 'title', name: 'title', type: 'string' },
        { label: 'description', name: 'description', type: 'string' },
        { label: 'location', name: 'location', type: 'string' },
        { label: 'date', name: 'date', type: 'string' },
        { label: 'tag', name: 'tag', type: 'string' },
      ],
    },
    createRichText('worlds_fair_calendar'),
    createRichText('bring_argentina_onchain'),
    {
      name: 'bring_argentina_onchain_list',
      label: 'bring_argentina_onchain_list',
      list: true,
      type: 'object',
      fields: [
        { label: 'title', name: 'title', type: 'string' },
        { label: 'description', name: 'description', type: 'string' },
        { label: 'url', name: 'url', type: 'string' },
        { label: 'url_text', name: 'url_text', type: 'string' },
      ],
    },
    {
      label: 'ticket_cta',
      name: 'ticket_cta',
      type: 'string',
    },
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
