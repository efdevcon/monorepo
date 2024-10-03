import React, { useState } from 'react'

const AdminPushNotification = () => {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [message, setMessage] = useState('')

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const response = await fetch(
        `${
          process.env.NODE_ENV === 'production' ? 'https://api.devcon.org' : 'http://localhost:4000'
        }/send-notification`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ title, body }),
        }
      )

      const data = await response.json()

      if (response.ok) {
        setMessage('Notification sent successfully')
      } else {
        setMessage(`Error: ${data.message}`)
      }
    } catch (error) {
      console.error('Error sending notification:', error)
      setMessage('An error occurred while sending the notification')
    }
  }

  return (
    <div className="flex flex-col">
      <h1>Send Push Notification</h1>
      <form onSubmit={handleSendNotification}>
        <div>
          <label>
            Title:
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} required />
          </label>
        </div>
        <div>
          <label>
            Body:
            <textarea value={body} onChange={e => setBody(e.target.value)} required />
          </label>
        </div>
        <button type="submit">Send Notification</button>
      </form>
      {message && <p>{message}</p>}
    </div>
  )
}

export default AdminPushNotification
