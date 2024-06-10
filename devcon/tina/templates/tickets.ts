import { Template } from 'tinacms'
import { button, createRichText } from '../presets'

const tickets: Template = {
  name: 'tickets',
  label: 'tickets',
  fields: [
    {
      label: 'overview',
      name: 'overview',
      type: 'object',
      fields: [createRichText('intro'), createRichText('card'), button('button')],
    },
    {
      label: 'raffle_auction',
      name: 'raffle_auction',
      type: 'object',
      fields: [
        createRichText('intro'),
        {
          label: 'participation_rules',
          name: 'participation_rules',
          type: 'object',
          fields: [
            {
              label: 'snapshot',
              name: 'snapshot',
              list: true,
              type: 'object',
              fields: [
                { label: 'left', name: 'left', type: 'string' },
                { label: 'right', name: 'right', type: 'string' },
              ],
            },
            createRichText('text'),
          ],
        },
        createRichText('sybil_resistance'),
        createRichText('specs'),
      ],
    },
    {
      label: 'discounts',
      name: 'discounts',
      type: 'object',
      fields: [
        createRichText('intro'),
        createRichText('self_claimed'),
        createRichText('application_based'),
        createRichText('specs'),
      ],
    },
    {
      label: 'other_methods_to_attend',
      name: 'other_methods_to_attend',
      type: 'object',
      fields: [
        {
          label: 'steps_raffle',
          name: 'steps_raffle',
          list: true,
          type: 'object',
          fields: [{ label: 'title', name: 'title', type: 'string' }, createRichText('answer')],
        },
      ],
    },
    {
      label: 'timeline',
      name: 'timeline',
      type: 'object',
      fields: [
        {
          label: 'steps_raffle',
          name: 'steps_raffle',
          list: true,
          type: 'object',
          fields: [{ label: 'title', name: 'title', type: 'string' }, createRichText('answer')],
        },
        {
          label: 'steps_discount',
          name: 'steps_discount',
          list: true,
          type: 'object',
          fields: [{ label: 'title', name: 'title', type: 'string' }, createRichText('answer')],
        },
        {
          label: 'steps_general_sale',
          name: 'steps_general_sale',
          list: true,
          type: 'object',
          fields: [{ label: 'title', name: 'title', type: 'string' }, createRichText('answer')],
        },
      ],
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

export default tickets
