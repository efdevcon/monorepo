import { Template } from 'tinacms'
// @ts-ignore
import { button, createRichText } from '../../../lib/cms/presets'

const perks: Template = {
  name: 'perks',
  label: 'perks',
  fields: [
    createRichText('perks_explainer'),
    createRichText('perks_explainer_2'),
    {
      type: 'string',
      label: 'zupass_explainer',
      name: 'zupass_explainer',
    },
    createRichText('perks_create_your_own_perk'),
  ],
}

export default perks
