import React, { useState } from 'react'
import { supabase } from 'common/supabaseClient'

interface CouponFeedProps {
  onCouponsUploaded?: (count: number) => void
}

/* 
  1) Add CSV file to public folder
  2) Update url in coupon object
  3) Update collection name in coupon object
  4) Update zk_proof_id to match the proof ID used in perks system
*/

const CouponFeed: React.FC<CouponFeedProps> = ({ onCouponsUploaded }) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const couponToUpload = {
    url: '/dont-push-coupons/privacy-stack.csv',
    collection: 'privacy-stack',
    zk_proof_id: 'Devconnect ARG', // Must match the proof ID used in the perks system
  }

  const uploadCoupons = async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      console.log('Fetching coupons from:', couponToUpload.url)

      const response = await fetch(couponToUpload.url)

      if (!response.ok) {
        throw new Error(`Failed to fetch CSV file: ${response.status} ${response.statusText}`)
      }

      const fileContent = await response.text()

      // Parse CSV (simple parsing for the format)
      const lines = fileContent
        .split('\n')
        .map((line: string) => line.trim())
        .filter((line: string) => line.length > 0)

      if (lines.length === 0) {
        throw new Error('No valid coupon codes found in CSV file')
      }

      // Upsert coupons into Supabase (only insert new ones, ignore duplicates)
      const couponRecords = lines.map(line => ({
        collection: couponToUpload.collection,
        zk_proof_id: couponToUpload.zk_proof_id,
        value: line,
        claimed_by: null,
        claimed_date: null,
      }))

      const { data, error: upsertError } = await supabase
        .from('coupons')
        .upsert(couponRecords, {
          onConflict: 'collection,value',
          ignoreDuplicates: true,
        })
        .select()

      if (upsertError) {
        throw new Error(`Failed to upsert coupons: ${upsertError.message}`)
      }

      const newCouponsCount = data?.length || 0
      const skippedCount = lines.length - newCouponsCount

      console.log(`Successfully processed ${lines.length} coupons: ${newCouponsCount} new, ${skippedCount} existing`)

      if (newCouponsCount > 0 && skippedCount > 0) {
        setSuccess(
          `Successfully uploaded ${newCouponsCount} new coupons to the database! (${skippedCount} already existed and were skipped)`
        )
      } else if (newCouponsCount > 0) {
        setSuccess(`Successfully uploaded ${newCouponsCount} new coupons to the database!`)
      } else {
        setSuccess(`All ${lines.length} coupons already exist in the database. No new coupons were added.`)
      }

      // Call the callback if provided
      if (onCouponsUploaded) {
        onCouponsUploaded(newCouponsCount)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      console.error('Error uploading coupons:', errorMessage)
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="coupon-feed bg-white p-6 rounded-lg border border-solid border-gray-500 shadow-lg mb-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4 font-secondary">Upload Coupons to Database</h2>

      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-2">
          Collection: <span className="font-mono text-blue-600">{couponToUpload.collection}</span>
        </p>
        <p className="text-sm text-gray-600 mb-2">
          ZK Proof ID: <span className="font-mono text-blue-600">{couponToUpload.zk_proof_id}</span>
        </p>
        <p className="text-sm text-gray-600 mb-4">
          Source: <span className="font-mono text-blue-600">{couponToUpload.url}</span>
        </p>

        <button
          onClick={uploadCoupons}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? 'Uploading Coupons...' : 'Upload Coupons to Database'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          <strong>Error:</strong> {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
          <strong>Success:</strong> {success}
        </div>
      )}
    </div>
  )
}

export default CouponFeed
