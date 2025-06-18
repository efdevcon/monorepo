import { LexiconDoc, Lexicons } from "@atproto/lexicon";
import { schema } from "./schema";

// Create a Lexicons instance
const lexicons = new Lexicons();

// Add your schema to the lexicons
lexicons.add(schema as any);

// Validate a record against your schema
const validateRecord = (record: any) => {
  try {
    // This will use the same validation logic as the PDS
    lexicons.assertValidRecord("org.devcon.event.v1", record.record || record);
    return { valid: true };
  } catch (error) {
    console.log(error);
    return { valid: false, error };
  }
};

export default validateRecord;
