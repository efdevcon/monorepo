import { Template } from 'tinacms'
import { createRichText } from '../presets'

const sea_local: Template = {
  name: 'sea_local',
  label: 'sea_local',
  fields: [createRichText('content')],
}

export default sea_local
