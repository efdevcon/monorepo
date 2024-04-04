import request from 'supertest'
import app from './app'

describe('App', () => {
  test('should configure default App', async () => {
    expect(app).toBeDefined()
  })

  test('should return 200 on GET /', async () => {
    const res = await request(app).get('/')
    expect(res.statusCode).toBe(200)
  })

  test('should return 404 on GET /invalid-path', async () => {
    const res = await request(app).get('/invalid-path')
    expect(res.statusCode).toBe(404)
  })
})
