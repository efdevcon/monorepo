import { Template } from 'tinacms'
import { button, createRichText } from '../presets'

const about: Template = {
  name: 'about',
  label: 'about',
  fields: [
    // createRichText('about'),
    // {
    //   label: 'about_card',
    //   name: 'about_card',
    //   type: 'object',
    //   fields: [createRichText('card'), button('button')],
    // },
    // createRichText('impact_forum'),
    // createRichText('programming_tickets'),
    createRichText('ctas'),
  ],
}

export default about
