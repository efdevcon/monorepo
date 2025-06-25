import { LexiconDoc, Lexicons } from "@atproto/lexicon";
import { schema } from "./schema";
import zod from "zod";

// Create a Lexicons instance
const lexicons = new Lexicons();

// Add your schema to the lexicons
lexicons.add(schema as any);

// Validate a record against your schema
const validateRecord = (record: any) => {
  try {
    // This will use the same validation logic as the PDS
    lexicons.assertValidRecord("org.devcon.event", record);

    // Validate start and end utc are before and after respectively
    const start = new Date(record.start_utc);
    const end = new Date(record.end_utc);

    if (end < start) {
      throw { valid: false, error: "End date must be after start date" };
    }

    // Validate timeslots are before and after respectively
    if (record.timeslots) {
      const timeslots = record.timeslots;

      for (const timeslot of timeslots) {
        const start = new Date(timeslot.start_utc);
        const end = new Date(timeslot.end_utc);

        if (end < start) {
          throw {
            valid: false,
            error: "Timeslot end date must be after start date",
          };
        }
      }
    }

    return { valid: true };
  } catch (error) {
    console.log(error);
    return { valid: false, error };
  }
};

export default validateRecord;
