import { Timestamp, FieldValue } from '@angular/fire/firestore';

/**
 * Converts a Firestore `Timestamp`, `FieldValue`, or `Date` to a JavaScript `Date` object.
 * @param timestamp - The value to convert, which can be a Firestore `Timestamp`, `FieldValue`, `Date`, `null`, or `undefined`.
 * @returns The corresponding JavaScript `Date` object, or `null` if conversion is not possible.
 */
export function convertToDate(timestamp: Timestamp | FieldValue | Date | null | undefined): Date | null {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  } else if (timestamp instanceof Date) {
    return timestamp;
  }
  return null;
}
