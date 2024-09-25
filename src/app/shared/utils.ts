import { Timestamp, FieldValue } from '@angular/fire/firestore';

export function convertToDate(timestamp: Timestamp | FieldValue | Date | null | undefined): Date | null {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  } else if (timestamp instanceof Date) {
    return timestamp;
  }
  return null;
}
