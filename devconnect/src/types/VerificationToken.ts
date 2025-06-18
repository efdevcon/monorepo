
export interface VerificationToken {
  _id?: any
  identifier: string
  nonce: number
  issued: Date
  expires: Date
}
