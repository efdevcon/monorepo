import dbConnect from "../utils/dbConnect"
import { VerificationTokenRepository } from "../server/repositories/VerificationTokenRepository"

Run()

async function Run() {
    const defaultDeletionDate = new Date(new Date().setDate(new Date().getDate() - 30))
    console.log('Deleting verification tokens older than default deletion date', defaultDeletionDate)

    await dbConnect()
    const tokenRepo = new VerificationTokenRepository()

    const result = await tokenRepo.deleteMany({ issued: { $lt: defaultDeletionDate } })
    console.log('ITEMS Deleted?', result)

    process.exit(0)
}
