'use client'
import { useConfig } from '@payloadcms/ui'
import { formatAdminURL } from 'payload/shared'
import { useEffect, useState } from 'react'

export const BeforeDashboardClient = () => {
  const { config } = useConfig()

  const [message, setMessage] = useState('')

  useEffect(() => {
    const fetchMessage = async () => {
      try {
        const response = await fetch(
          formatAdminURL({
            apiRoute: config.routes.api,
            path: '/my-plugin-endpoint',
          }),
        )

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`)
        }

        const result: unknown = await response.json()
        if (
          typeof result === 'object' &&
          result !== null &&
          'message' in result &&
          typeof (result as { message: unknown }).message === 'string'
        ) {
          setMessage((result as { message: string }).message)
        } else {
          setMessage('Invalid response from endpoint.')
        }
      } catch {
        setMessage('Failed to load message.')
      }
    }

    void fetchMessage()
  }, [config.routes.api])

  return (
    <div>
      <h1>Added by the plugin: Before Dashboard Client</h1>
      <div>
        Message from the endpoint:
        <div>{message || 'Loading...'}</div>
      </div>
    </div>
  )
}
