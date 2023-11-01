import { EmailService } from './email-service'

// Test credentials
// Name	Niko Dooley
// Username	uem5bkcwoy4nfeov@ethereal.email (also works as a real inbound email address)
// Password	eP8ytB79mBpfGaCtmh

test('Init search index client', () => {
  const client = new EmailService()

  expect(client).not.toBeNull()
})

test('Send blank test email', async () => {
  const client = new EmailService()

  await client.sendMail('uem5bkcwoy4nfeov@ethereal.email', 'default-email', 'Sending default test email', {
    TITLE: 'Confirm email address',
    DESCRIPTION: 'Use the link below to confirm your email address and link it to your devcon.org user account.',
    CALL_TO_ACTION: 'Confirm',
    URL: 'https://www.devcon.org/'
  })
})
