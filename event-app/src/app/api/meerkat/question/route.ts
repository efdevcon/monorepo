import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { sessionId, question } = body

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })
    }

    if (!question) {
      return NextResponse.json({ error: 'Missing question' }, { status: 400 })
    }

    // Mock Meerkat submission — no real external call
    const questionId = `meerkat-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

    return NextResponse.json({ success: true, questionId })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to submit question', details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
