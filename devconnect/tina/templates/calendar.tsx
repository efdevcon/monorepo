import { Template } from 'tinacms'
// @ts-ignore
import { button, createRichText } from '../../../lib/cms/presets'

const calendar: Template = {
  name: 'calendar',
  label: 'calendar',
  fields: [createRichText('calendar_disclaimer'), createRichText('calendar_how_to_apply')],
}

export default calendar
