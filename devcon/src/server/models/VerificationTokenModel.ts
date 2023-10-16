import { Document, model, Schema } from 'mongoose'
import { VerificationToken } from 'types/VerificationToken'

interface VerificationTokenModel extends VerificationToken, Document {}

const schema: Schema = new Schema(
  {
    identifier: { type: String },
    nonce: { type: Number },
    issued: { type: Date, default: new Date() },
    expires: { type: Date },
  },
  { timestamps: false }
)

let mongooseModel: any
try {
  mongooseModel = model<VerificationTokenModel>('VerificationToken')
} catch (e) {
  mongooseModel = model<VerificationTokenModel>('VerificationToken', schema)
}

export default mongooseModel
