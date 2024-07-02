import { Template } from 'tinacms'
import { button, createRichText } from '../presets'

const city_guide: Template = {
  name: 'city_guide',
  label: 'city_guide',
  fields: [
    createRichText('overview'),
    // {
    //   label: 'city_guide_card',
    //   name: 'city_guide_card',
    //   type: 'object',
    //   fields: [createRichText('card'), button('button')],
    // },
    // createRichText('impact_forum'),
    // createRichText('programming_tickets'),
  ],
}

export default city_guide
