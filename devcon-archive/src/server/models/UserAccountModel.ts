import { Document, model, Schema } from 'mongoose'
import { UserAccount } from 'src/types/UserAccount'

interface UserAccountModel extends UserAccount, Document {}

const userAccountSchema: Schema = new Schema(
  {
    username: { type: String },
    email: { type: String, match: /.+@.+\..+/ },
    addresses: { type: [String] },
    disabled: { type: Boolean, required: false, default: false },
  },
  { timestamps: true }
)

export default model<UserAccountModel>('UserAccount', userAccountSchema)
