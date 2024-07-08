import { Template } from 'tinacms'
import { button, createRichText } from '../presets'

const city_guide: Template = {
  name: 'city_guide',
  label: 'city_guide',
  fields: [
    createRichText('intro_city_guide'),
    {
      label: 'intro_snapshot',
      name: 'intro_snapshot',
      type: 'object',
      fields: [
        createRichText('title'),
        {
          label: 'snapshot',
          name: 'snapshot',
          list: true,
          type: 'object',
          fields: [
            createRichText('left'),
            createRichText('right'),
            // { label: 'left', name: 'left', type: 'string' },
            // { label: 'right', name: 'right', type: 'string' },
          ],
        },
      ],
    },
    createRichText('city_of_angels'),
    createRichText('why_sea'),
    createRichText('why_sea_second_part'),
    createRichText('local_experiences'),
    {
      name: 'community_guides',
      label: 'community_guides',
      type: 'object',
      fields: [
        createRichText('text'),
        {
          name: 'community_guides',
          label: 'community_guides',
          type: 'object',
          list: true,
          fields: [
            {
              name: 'title',
              label: 'title',
              type: 'string',
            },
            {
              name: 'author',
              label: 'author',
              type: 'string',
            },
            {
              name: 'card',
              label: 'card',
              type: 'string',
            },
            {
              name: 'url',
              label: 'url',
              type: 'string',
            },
          ],
        },
      ],
    },
    {
      name: 'areas',
      label: 'areas',
      list: true,
      type: 'object',

      fields: [
        {
          name: 'title',
          label: 'title',
          type: 'string',
        },
        createRichText('text'),
        {
          name: 'metro_distance',
          label: 'metro_distance',
          type: 'string',
        },
        {
          name: 'metro_station',
          label: 'metro_station',
          type: 'string',
        },
        {
          name: 'metro_url',
          label: 'metro_url',
          type: 'string',
        },
      ],
    },
    createRichText('getting_around'),
    {
      label: 'city_guide_faq',
      name: 'city_guide_faq',
      list: true,
      type: 'object',
      fields: [{ label: 'question', name: 'question', type: 'string' }, createRichText('answer')],
    },
  ],
}

export default city_guide
