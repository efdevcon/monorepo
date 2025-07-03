import React, { useState } from 'react'

interface CouponFeedProps {
  onCouponsLoaded?: (coupons: Record<string, string[]>) => void
}

const CouponFeed: React.FC<CouponFeedProps> = ({ onCouponsLoaded }) => {
  const [loading, setLoading] = useState(false)
  const [coupons, setCoupons] = useState<Record<string, string[]>>({})
  const [error, setError] = useState<string | null>(null)

  const couponUrl = '/dont-push-coupons/devcon-sea-attendee.csv'

  const feedCoupons = async () => {
    setLoading(true)
    setError(null)

    try {
      console.log('Fetching coupons from:', couponUrl)

      const response = await fetch(couponUrl)

      if (!response.ok) {
        throw new Error(`Failed to fetch coupons: ${response.status} ${response.statusText}`)
      }

      const fileContent = await response.text()

      // Parse CSV (simple parsing for the format)
      const lines = fileContent
        .split('\n')
        .map((line: string) => line.trim())
        .filter((line: string) => line.length > 0)

      // Use filename without extension as key
      const collectionName = 'devcon-sea-attendee'
      const loadedCoupons = { [collectionName]: lines }

      setCoupons(loadedCoupons)
      console.log(`Loaded ${lines.length} coupons for collection: ${collectionName}`)
      console.log('Coupons:', loadedCoupons)

      // Call the callback if provided
      if (onCouponsLoaded) {
        onCouponsLoaded(loadedCoupons)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      console.error('Error loading coupons:', errorMessage)
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="coupon-feed">
      <div className="mb-4">
        <button
          onClick={feedCoupons}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? 'Loading Coupons...' : 'Load Coupons'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          <strong>Error:</strong> {error}
        </div>
      )}

      {Object.keys(coupons).length > 0 && (
        <div className="coupon-results">
          <h3 className="text-lg font-semibold mb-2">Loaded Coupons:</h3>
          {Object.entries(coupons).map(([collection, codes]) => (
            <div key={collection} className="mb-4">
              <h4 className="font-medium text-gray-700 mb-1">
                {collection} ({codes.length} coupons)
              </h4>
              <div className="max-h-40 overflow-y-auto bg-gray-50 p-2 rounded border">
                {codes.map((code, index) => (
                  <div key={index} className="text-sm font-mono text-gray-600">
                    {code}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default CouponFeed
