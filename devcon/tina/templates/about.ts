import { Template } from 'tinacms'
import { button, createRichText } from '../presets'

const about: Template = {
  name: 'about',
  label: 'about',
  fields: [
    createRichText('what_is_devcon'),
    createRichText('for_whom'),
    createRichText('global_communities'),
    createRichText('global_communities_right'),
    createRichText('ctas'),
  ],
}

export default about
