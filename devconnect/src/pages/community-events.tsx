import React, { useState } from 'react'
import { Footer, Header, withTranslations } from 'pages/index'
import client from '../../tina/__generated__/client'
import css from './community-events.module.scss'

interface EventFormData {
  // Required fields
  start_utc: string
  end_utc: string
  title: string
  description: string
  main_url: string
  organizer: {
    name: string
    contact?: string
  }
  location: {
    name: string
    address?: string
  }
  // Optional fields (previously in metadata)
  timeslots?: Array<{
    start_utc: string
    end_utc: string
    title: string
    description?: string
    event_uri?: string
  }>
  image_url?: string
  requires_ticket?: boolean
  sold_out?: boolean
  capacity?: number
  expertise_level?: string
  type?: string
  categories?: string[]
  search_tags?: string[]
  socials?: Array<{
    platform: string
    url: string
  }>
}

const CommunityEvents = () => {
  const [formData, setFormData] = useState<EventFormData>({
    start_utc: '',
    end_utc: '',
    title: '',
    description: '',
    main_url: '',
    organizer: {
      name: '',
      contact: '',
    },
    location: {
      name: '',
      address: '',
    },
    timeslots: [],
    image_url: '',
    requires_ticket: false,
    sold_out: false,
    capacity: undefined,
    expertise_level: 'all welcome',
    type: '',
    categories: [],
    search_tags: [],
    socials: [],
  })

  const [showOptionalSections, setShowOptionalSections] = useState({
    optional: false,
  })

  const expertiseLevels = ['all welcome', 'beginner', 'intermediate', 'expert', 'other']
  const eventTypes = ['talk', 'hackathon', 'workshop', 'panel', 'mixed format', 'social', 'other']
  const eventCategories = [
    'real world ethereum',
    'defi',
    'cypherpunk & privacy',
    'security',
    'ai',
    'protocol',
    'devex',
    'usability',
    'applied cryptography',
    'coordination',
    'scalability',
    'other',
  ]

  // Helper functions for datetime conversion
  const formatDateTimeForInput = (isoString: string): string => {
    if (!isoString) return ''
    // Convert from "2024-03-20T10:00:00Z" to "2024-03-20T10:00"
    return isoString.slice(0, 16)
  }

  const formatDateTimeFromInput = (inputValue: string): string => {
    if (!inputValue) return ''
    // Convert from "2024-03-20T10:00" to "2024-03-20T10:00:00Z"
    return inputValue + ':00Z'
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleNestedChange = (parent: string, field: string, value: any) => {
    setFormData(prev => {
      const parentObj = (prev[parent as keyof EventFormData] as Record<string, any>) || {}
      return {
        ...prev,
        [parent]: {
          ...parentObj,
          [field]: value,
        },
      }
    })
  }

  const addTimeslot = () => {
    setFormData(prev => ({
      ...prev,
      timeslots: [
        ...(prev.timeslots || []),
        {
          start_utc: '',
          end_utc: '',
          title: '',
          description: '',
          event_uri: '',
        },
      ],
    }))
  }

  const removeTimeslot = (index: number) => {
    setFormData(prev => ({
      ...prev,
      timeslots: prev.timeslots?.filter((_, i) => i !== index),
    }))
  }

  const updateTimeslot = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      timeslots: prev.timeslots?.map((slot, i) => (i === index ? { ...slot, [field]: value } : slot)),
    }))
  }

  const addSocial = () => {
    setFormData(prev => ({
      ...prev,
      socials: [...(prev.socials || []), { platform: '', url: '' }],
    }))
  }

  const removeSocial = (index: number) => {
    setFormData(prev => ({
      ...prev,
      socials: prev.socials?.filter((_, i) => i !== index),
    }))
  }

  const updateSocial = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      socials: prev.socials?.map((social, i) => (i === index ? { ...social, [field]: value } : social)),
    }))
  }

  const handleArrayInputChange = (field: string, value: string) => {
    const arrayValue = value
      .split(',')
      .map(item => item.trim())
      .filter(item => item)
    setFormData(prev => ({
      ...prev,
      [field]: arrayValue,
    }))
  }

  const handleCategoryChange = (category: string, checked: boolean) => {
    setFormData(prev => {
      const currentCategories = prev.categories || []
      const newCategories = checked
        ? [...currentCategories, category]
        : currentCategories.filter(cat => cat !== category)

      return {
        ...prev,
        categories: newCategories,
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Clean up the data before submission - remove empty optional fields
    const cleanedData = { ...formData }

    // Remove empty timeslots
    if (!cleanedData.timeslots?.length) {
      delete cleanedData.timeslots
    }

    // Remove empty optional fields
    if (!cleanedData.image_url) delete cleanedData.image_url
    if (!cleanedData.type) delete cleanedData.type
    if (!cleanedData.expertise_level || cleanedData.expertise_level === 'all welcome') {
      cleanedData.expertise_level = 'all welcome' // Keep default
    }
    if (!cleanedData.categories?.length) delete cleanedData.categories
    if (!cleanedData.search_tags?.length) delete cleanedData.search_tags
    if (!cleanedData.socials?.length) delete cleanedData.socials
    if (!cleanedData.capacity) delete cleanedData.capacity

    console.log('Event data to submit:', cleanedData)
    // TODO: Submit to your API/backend
    alert('Event submitted! Check console for data.')
  }

  return (
    <div className="flex flex-col justify-between min-h-screen">
      <Header active fadeOutOnScroll />
      <div className="max-w-[600px] mx-auto flex-1 my-48">
        <div className="bg-white">
          {/* <h1 className="text-3xl font-bold text-gray-900 mb-8">Submit Community Event</h1> */}

          <form onSubmit={handleSubmit} className={css.form}>
            {/* Required Fields */}
            <div className="bg-blue-200 p-6 rounded-lg">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Event Details (Required)</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Event Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={e => handleInputChange('title', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Title of the event</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date & Time (UTC) *</label>
                  <input
                    type="datetime-local"
                    required
                    value={formatDateTimeForInput(formData.start_utc)}
                    onChange={e => handleInputChange('start_utc', formatDateTimeFromInput(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Start time of the entire event in UTC (use the 'timeslots' field for granular scheduling)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date & Time (UTC) *</label>
                  <input
                    type="datetime-local"
                    required
                    value={formatDateTimeForInput(formData.end_utc)}
                    onChange={e => handleInputChange('end_utc', formatDateTimeFromInput(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    End time of the entire event in UTC (use the 'timeslots' field for granular scheduling)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Main Website/URL *</label>
                  <input
                    type="url"
                    required
                    placeholder="e.g., https://example.com or https://twitter.com/event"
                    value={formData.main_url}
                    onChange={e => handleInputChange('main_url', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Main web property of the event (e.g. website or twitter profile)
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Event Description *</label>
                <textarea
                  required
                  rows={4}
                  value={formData.description}
                  onChange={e => handleInputChange('description', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Description of the event</p>
              </div>

              {/* Organizer Fields */}
              <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-800 mb-4">Organizer Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Organizer Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.organizer.name}
                      onChange={e => handleNestedChange('organizer', 'name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Name of the event organizer</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contact (Email, Twitter, etc.)
                    </label>
                    <input
                      type="text"
                      value={formData.organizer.contact}
                      onChange={e => handleNestedChange('organizer', 'contact', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Contact of the organizer (email, twitter, etc.)</p>
                  </div>
                </div>
              </div>

              {/* Location Fields */}
              <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-800 mb-4">Location Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Location Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.location.name}
                      onChange={e => handleNestedChange('location', 'name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Name of the location</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                    <input
                      type="text"
                      value={formData.location.address}
                      onChange={e => handleNestedChange('location', 'address', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Address of the location</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Optional Fields Section */}
            <div className="bg-gray-100 p-6 rounded-lg mt-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-800">Additional Information (Optional)</h2>
                <button
                  type="button"
                  onClick={() => setShowOptionalSections(prev => ({ ...prev, optional: !prev.optional }))}
                  className="text-blue-600 hover:text-blue-800"
                >
                  {showOptionalSections.optional ? 'Hide' : 'Show'}
                </button>
              </div>

              {showOptionalSections.optional && (
                <div className="space-y-6 mt-6">
                  {/* Event Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Event Type</label>
                      <select
                        value={formData.type || ''}
                        onChange={e => handleInputChange('type', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select event type</option>
                        {eventTypes.map(type => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        Type of event, e.g. conference, talks, hackathon, etc.
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Expertise Level</label>
                      <select
                        value={formData.expertise_level || 'all welcome'}
                        onChange={e => handleInputChange('expertise_level', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {expertiseLevels.map(level => (
                          <option key={level} value={level}>
                            {level}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">Expertise level of the event</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Capacity</label>
                      <input
                        type="number"
                        min="1"
                        value={formData.capacity || ''}
                        onChange={e => handleInputChange('capacity', parseInt(e.target.value) || undefined)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">How many people can attend the event</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Image URL</label>
                      <input
                        type="url"
                        value={formData.image_url || ''}
                        onChange={e => handleInputChange('image_url', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Url referencing an image for this event. Image should be .png, squared, and we suggest at least
                        1024x1024px.
                      </p>
                    </div>
                  </div>

                  {/* Categories */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Categories</label>
                    <div className="space-y-2">
                      {eventCategories.map(category => (
                        <label key={category} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.categories?.includes(category) || false}
                            onChange={e => handleCategoryChange(category, e.target.checked)}
                            className="mr-2"
                          />
                          {category}
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Categories of the event (e.g. defi, privacy, security, etc.)
                    </p>
                  </div>

                  {/* Search Tags */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Search Tags (comma-separated)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., ethereum, blockchain, crypto"
                      value={formData.search_tags?.join(', ') || ''}
                      onChange={e => handleArrayInputChange('search_tags', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Searching tags for the event</p>
                  </div>

                  {/* Ticket Options */}
                  <div className="flex flex-col gap-4">
                    <div className="flex gap-6">
                      <div className="flex flex-col">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.requires_ticket || false}
                            onChange={e => handleInputChange('requires_ticket', e.target.checked)}
                            className="mr-2"
                          />
                          Requires Ticket
                        </label>
                        <p className="text-xs text-gray-500 mt-1">Whether the event requires tickets</p>
                      </div>

                      <div className="flex flex-col">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.sold_out || false}
                            onChange={e => handleInputChange('sold_out', e.target.checked)}
                            className="mr-2"
                          />
                          Sold Out
                        </label>
                        <p className="text-xs text-gray-500 mt-1">Whether the event is sold out</p>
                      </div>
                    </div>
                  </div>

                  {/* Timeslots Section */}
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-medium text-gray-800">Timeslots</h3>
                      <button type="button" onClick={addTimeslot} className="text-blue-600 hover:text-blue-800 text-sm">
                        + Add Timeslot
                      </button>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Optional event timeslots - this may be useful for events that span multiple days, need to specify
                      timeslots for each day, or otherwise need more granular scheduling.
                    </p>

                    <div className="space-y-4">
                      {formData.timeslots?.map((slot, index) => (
                        <div key={index} className="bg-white p-4 rounded border">
                          <div className="flex justify-between items-start mb-3">
                            <h4 className="font-medium">Timeslot {index + 1}</h4>
                            <button
                              type="button"
                              onClick={() => removeTimeslot(index)}
                              className="text-red-600 hover:text-red-800"
                            >
                              Remove
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time (UTC) *</label>
                              <input
                                type="datetime-local"
                                required
                                value={formatDateTimeForInput(slot.start_utc)}
                                onChange={e =>
                                  updateTimeslot(index, 'start_utc', formatDateTimeFromInput(e.target.value))
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <p className="text-xs text-gray-500 mt-1">Start of the timeslot in UTC</p>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">End Time (UTC) *</label>
                              <input
                                type="datetime-local"
                                required
                                value={formatDateTimeForInput(slot.end_utc)}
                                onChange={e =>
                                  updateTimeslot(index, 'end_utc', formatDateTimeFromInput(e.target.value))
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <p className="text-xs text-gray-500 mt-1">End of the timeslot in UTC</p>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                              <input
                                type="text"
                                required
                                value={slot.title}
                                onChange={e => updateTimeslot(index, 'title', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <p className="text-xs text-gray-500 mt-1">Title of the timeslot</p>
                            </div>
                          </div>

                          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Description (optional)
                              </label>
                              <textarea
                                rows={2}
                                value={slot.description}
                                onChange={e => updateTimeslot(index, 'description', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <p className="text-xs text-gray-500 mt-1">Description of the timeslot</p>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Event URI (optional)
                              </label>
                              <input
                                type="text"
                                value={slot.event_uri}
                                onChange={e => updateTimeslot(index, 'event_uri', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <p className="text-xs text-gray-500 mt-1">
                                If the timeslot is a more intricate/detailed event that needs more than the basic title
                                and description, this would refer to the atproto record key of that event
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Social Media Links */}
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-medium text-gray-800">Social Media Links</h3>
                      <button type="button" onClick={addSocial} className="text-blue-600 hover:text-blue-800 text-sm">
                        + Add Social
                      </button>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Array of social media platforms with platform name and URL
                    </p>

                    {formData.socials?.map((social, index) => (
                      <div key={index} className="flex gap-4 mb-3">
                        <input
                          type="text"
                          placeholder="Platform (e.g., Twitter, Discord)"
                          value={social.platform}
                          onChange={e => updateSocial(index, 'platform', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                          type="url"
                          placeholder="URL"
                          value={social.url}
                          onChange={e => updateSocial(index, 'url', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => removeSocial(index)}
                          className="text-red-600 hover:text-red-800 px-3"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="py-6">
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Submit Event
              </button>
            </div>
          </form>
        </div>
      </div>
      <Footer />
    </div>
  )
}

export async function getStaticProps({ locale }: { locale: string }) {
  const translationPath = locale === 'en' ? 'global.json' : locale + '/global.json'
  const translations = await client.queries.global_translations({ relativePath: translationPath })

  return {
    props: {
      translations,
    },
  }
}
export default withTranslations(CommunityEvents)
