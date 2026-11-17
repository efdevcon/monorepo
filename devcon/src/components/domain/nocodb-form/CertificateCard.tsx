import React, { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { supabase } from 'services/supabase-browser'
import type { FormCertificate } from 'config/certificates'

/**
 * The signed-in person's certificate (api/nocodb/[viewId]/certificate): a
 * preview and a download button. Fetched with the form's session, so it is
 * only ever their own.
 */
export function CertificateCard({ viewId, certificate }: { viewId: string; certificate: FormCertificate }) {
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let objectUrl: string | null = null
    let cancelled = false
    setUrl(null)
    setError('')
    ;(async () => {
      try {
        const session = supabase ? (await supabase.auth.getSession()).data.session : null
        if (!session?.access_token) throw new Error('Sign in again to get your certificate.')
        const res = await fetch(`/api/nocodb/${viewId}/certificate/`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || 'Could not load your certificate.')
        objectUrl = URL.createObjectURL(await res.blob())
        if (!cancelled) setUrl(objectUrl)
      } catch (err) {
        if (!cancelled) setError((err as Error).message)
      }
    })()
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [viewId])

  return (
    <div className="flex flex-col gap-3 w-full px-4 py-4 bg-[#f3f0ff] border border-[#decffb] rounded-lg text-sm leading-5 text-[#1a0d33]">
      <p className="font-bold text-[#160b2b]">Your certificate</p>
      {error ? (
        <p className="text-[#b42124]">{error}</p>
      ) : url ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="Your Devcon certificate" className="w-full rounded-md border border-[#decffb]" />
          <a
            href={url}
            download={certificate.fileName}
            className="self-center inline-flex items-center gap-2 px-6 py-3 bg-[#7235ed] text-white text-sm font-bold rounded-full hover:bg-[#6029d1] transition-colors"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            Download certificate
          </a>
        </>
      ) : (
        <p className="text-[#594d73]">Preparing your certificate...</p>
      )}
    </div>
  )
}
