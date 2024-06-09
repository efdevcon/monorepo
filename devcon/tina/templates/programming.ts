import { Template } from 'tinacms'
import { button, createRichText } from '../presets'

const programming: Template = {
  name: 'programming',
  label: 'programming',
  fields: [
    {
      label: 'overview',
      name: 'overview',
      type: 'object',
      fields: [createRichText('intro'), createRichText('speaker_applications'), button('button')],
    },
    createRichText('tracks'),
    {
      label: 'track_descriptions',
      name: 'track_descriptions',
      list: true,
      type: 'object',
      fields: [
        { label: 'id', name: 'id', type: 'string' },
        { label: 'name', name: 'name', type: 'string' },
        createRichText('description'),
        { label: 'tags', name: 'tags', type: 'string' },
      ],
    },
    {
      label: 'rfp',
      name: 'rfp',
      type: 'object',
      fields: [
        createRichText('description'),
        {
          label: 'steps',
          name: 'steps',
          list: true,
          type: 'object',
          fields: [{ label: 'title', name: 'title', type: 'string' }, createRichText('answer')],
        },
        button('button'),
      ],
    },
    {
      label: 'faq',
      name: 'faq',
      list: true,
      type: 'object',
      fields: [{ label: 'question', name: 'question', type: 'string' }, createRichText('answer')],
    },
    // {
    //   label: 'tracks',
    //   name: 'tracks',
    //   type: 'object',
    //   fields: [createRichText('description')],
    // },
    createRichText('additional_questions'),
    createRichText('supporters_tickets'),
  ],
}

export default programming
