import { Template } from 'tinacms'
import { button, createRichText } from '../presets'

const speaker_applications: Template = {
  name: 'speaker_applications',
  label: 'speaker_applications',
  fields: [
    createRichText('apply_to_speak'),
    {
      label: 'important_dates',
      name: 'important_dates',
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
      ],
    },
    {
      label: 'who_can_apply',
      name: 'who_can_apply',
      type: 'object',
      fields: [{ label: 'title', name: 'title', type: 'string' }, createRichText('body')],
    },
    {
      label: 'what_to_talk_about',
      name: 'what_to_talk_about',
      type: 'object',
      fields: [{ label: 'title', name: 'title', type: 'string' }, createRichText('body')],
    },
    {
      label: 'what_to_talk_about_second_part',
      name: 'what_to_talk_about_second_part',
      type: 'object',
      fields: [createRichText('body')],
    },
    {
      label: 'which_session_types',
      name: 'which_session_types',
      type: 'object',
      fields: [
        { label: 'title', name: 'title', type: 'string' },
        {
          label: 'session_types',
          name: 'session_types',
          type: 'object',
          list: true,
          fields: [{ label: 'title', name: 'title', type: 'string' }, createRichText('body')],
        },
      ],
    },
    {
      label: 'application_timeline',
      name: 'application_timeline',
      type: 'object',
      fields: [{ label: 'title', name: 'title', type: 'string' }, createRichText('body')],
    },
    {
      label: 'review_process',
      name: 'review_process',
      type: 'object',
      fields: [{ label: 'title', name: 'title', type: 'string' }, createRichText('body')],
    },
    {
      label: 'review_criteria',
      name: 'review_criteria',
      type: 'object',
      fields: [createRichText('body')],
    },
    {
      label: 'decision',
      name: 'decision',
      type: 'object',
      fields: [{ label: 'title', name: 'title', type: 'string' }, createRichText('body')],
    },
    {
      label: 'alternative_contributions',
      name: 'alternative_contributions',
      type: 'object',
      fields: [{ label: 'title', name: 'title', type: 'string' }, createRichText('body')],
    },
    // createRichText('alternative_contributions'),
  ],
}

export default speaker_applications
