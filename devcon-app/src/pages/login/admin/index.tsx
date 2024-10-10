import React, { useState, useEffect } from 'react'
import { Button } from 'lib/components/button'

interface Notification {
  id: string
  title: string
  message: string
  sendAt: string
  sent?: boolean
}

const AdminPushNotification = () => {
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [sendAt, setSendAt] = useState(() => {
    const now = new Date()
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
    return now.toISOString().slice(0, 16)
  })
  const [response, setResponse] = useState('')
  const [notifications, setNotifications] = useState<Notification[]>([])
  // const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    fetchNotifications()
  }, [])

  const fetchNotifications = async () => {
    try {
      const response = await fetch(
        `${process.env.NODE_ENV === 'production' ? 'https://api.devcon.org' : 'http://localhost:4000'}/notifications`,
        { credentials: 'include' }
      )
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.data)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    }
  }

  console.log('notifications', notifications)

  const handleCreateNotification = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch(
        `${process.env.NODE_ENV === 'production' ? 'https://api.devcon.org' : 'http://localhost:4000'}/notifications`,
        {
          credentials: 'include',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ title, message, sendAt }),
        }
      )

      if (response.ok) {
        setMessage('Notification created successfully')
        fetchNotifications()
        resetForm()
      } else {
        const data = await response.json()
        setResponse(`Error: ${data.message}`)
      }
    } catch (error) {
      console.error('Error sending notification:', error)
      setResponse('An error occurred while sending the notification')
    }
  }

  const handleDeleteNotification = async (id: string) => {
    try {
      const response = await fetch(
        `${
          process.env.NODE_ENV === 'production' ? 'https://api.devcon.org' : 'http://localhost:4000'
        }/notifications/${id}`,
        {
          credentials: 'include',
          method: 'DELETE',
        }
      )

      if (response.ok) {
        setResponse('Notification deleted successfully')
        fetchNotifications()
      } else {
        const data = await response.json()
        setResponse(`Error: ${data.message}`)
      }
    } catch (error) {
      console.error('Error deleting notification:', error)
      setResponse('An error occurred while deleting the notification')
    }
  }

  const resetForm = () => {
    setTitle('')
    setMessage('')
    setSendAt('')
    // setEditingId(null)
  }

  // const startEditing = (notification: Notification) => {
  //   setTitle(notification.title)
  //   setBody(notification.body)
  //   setSendAt(notification.sendAt)
  //   setEditingId(notification.id)
  // }

  return (
    <div className="flex flex-col gap-4 text-black p-12">
      <h3>{'Create'} Push Notification</h3>
      <form onSubmit={handleCreateNotification} className="max-w-[400px] flex flex-col gap-4">
        <div className="flex flex-col">
          Title:
          <input
            type="text"
            className="border border-gray-300 border-solid rounded-md p-2"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col">
          Message:
          <textarea
            className="border border-gray-300 border-solid rounded-md p-2"
            value={message}
            onChange={e => setMessage(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col">
          Send At:
          <input
            type="datetime-local"
            className="border border-gray-300 border-solid rounded-md p-2"
            value={sendAt}
            onChange={e => setSendAt(e.target.value)}
            required
          />
        </div>
        <Button type="submit" color="black-1" fill className="plain">
          {'Create'} Notification
        </Button>
        {/* {editingId && (
          <Button type="button" color="gray-1" fill className="plain" onClick={resetForm}>
            Cancel Edit
          </Button>
        )} */}
      </form>
      {response && <p>{response}</p>}

      <div className="flex flex-col gap-4">
        <h3>Notifications (ordered by send date)</h3>
        <p>
          Note that these notifications are sent to users with push notifications enabled, but are also visible in the
          notifications tab in the app for all other users. If you want to send a notification immediately, simply put
          the sending date anytime in the past. Notifications are sent every 5 minutes. Notifications cannot be edited -
          delete and create a new one if you want to make changes.
        </p>
        {notifications &&
          notifications.map(notification => (
            <div key={notification.id} className="border border-gray-300 rounded-md">
              <p>
                <strong>Title:</strong> {notification.title}
              </p>
              <p>
                <strong>Message:</strong> {notification.message}
              </p>
              <p>
                <strong>Send At:</strong> {new Date(notification.sendAt).toLocaleString()}
              </p>
              <p>
                <strong>Sent:</strong>{' '}
                <span className={notification.sent ? 'text-green-500 font-bold' : 'text-red-500 font-bold'}>
                  {notification.sent ? 'Yes' : 'No'}
                </span>
              </p>
              <div className="mt-2">
                <Button
                  onClick={() => handleDeleteNotification(notification.id)}
                  color="orange-1"
                  className="plain"
                  fill
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}

export default AdminPushNotification
