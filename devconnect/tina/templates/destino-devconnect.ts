import { Template } from 'tinacms'
// @ts-ignore
import { button, createRichText } from '../../../lib/cms/presets'

const pastEditions: Template = {
  name: 'destino_devconnect',
  label: 'destino_devconnect',
  fields: [
    {
      type: 'object',
      name: 'intro',
      label: 'Intro',
      fields: [createRichText('destino_devconnect_intro_title'), createRichText('destino_devconnect_intro')],
    },
    {
      type: 'object',
      name: 'destino_devconnect_about',
      label: 'About',
      fields: [
        {
          type: 'string',
          name: 'title',
          label: 'Title',
        },
        createRichText('description'),
        {
          type: 'object',
          list: true,
          name: 'what_is_it',
          label: 'What is it?',
          fields: [
            {
              type: 'string',
              name: 'title',
              label: 'Title',
            },
            createRichText('what_is_it'),
          ],
        },
      ],
    },
    {
      type: 'object',
      name: 'destino_devconnect_who_can_apply',
      label: 'Who can apply?',
      fields: [
        {
          type: 'string',
          name: 'title',
          label: 'Title',
        },
        {
          type: 'string',
          name: 'description',
          label: 'Description',
        },
        {
          list: true,
          type: 'object',
          name: 'destino_devconnect_who_can_apply_list',
          label: 'Who can apply list',
          fields: [
            {
              name: 'title',
              type: 'string',
              label: 'Title',
            },
            {
              name: 'description',
              type: 'string',
              label: 'Description',
            },
          ],
        },
        createRichText('disclaimers'),
        createRichText('scholarships_available'),
        createRichText('deadlines'),
      ],
    },
    {
      type: 'object',
      name: 'destino_devconnect_how_to_apply',
      label: 'How to apply?',
      fields: [
        {
          type: 'string',
          name: 'title',
          label: 'Title',
        },
        {
          list: true,
          type: 'object',
          name: 'destino_devconnect_how_to_apply_list',
          label: 'How to apply list',
          fields: [
            {
              name: 'title',
              type: 'string',
              label: 'Title',
            },
            {
              name: 'description',
              type: 'string',
              label: 'Description',
            },
          ],
        },
      ],
    },
    {
      type: 'object',
      name: 'destino_devconnect_where_to_apply',
      label: 'Where to apply?',
      fields: [
        {
          type: 'string',
          name: 'title',
          label: 'Title',
        },
        {
          type: 'string',
          name: 'description',
          label: 'Description',
        },
        {
          type: 'string',
          name: 'where_to_apply',
          label: 'Where to apply',
        },
      ],
    },
    {
      type: 'string',
      name: 'events_list_title',
      label: 'Events List Title',
    },
  ],
}

export default pastEditions
