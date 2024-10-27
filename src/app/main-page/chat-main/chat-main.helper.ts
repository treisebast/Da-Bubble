import { FieldValue, Timestamp } from "firebase/firestore";
import { Message } from "../../shared/models/message.model";

/**
 * Konvertiert einen Firestore Timestamp oder FieldValue in ein JavaScript Date-Objekt.
 * @param timestamp - Der Timestamp oder FieldValue von Firestore.
 * @returns Ein Date-Objekt.
 */
export function convertTimestampToDate(timestamp: Timestamp | FieldValue): Date {
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate();
    }
    return new Date();
  }
  
  /**
   * Sortiert ein Array von Nachrichten nach ihrem Zeitstempel.
   * @param messages - Das Array von Nachrichten, das sortiert werden soll.
   * @returns Ein neues Array von Nachrichten, sortiert nach Zeitstempel.
   */
  export function sortMessagesByTimestamp(messages: Message[]): Message[] {
    return messages.sort((a, b) => {
      const dateA = convertTimestampToDate(a.timestamp).getTime();
      const dateB = convertTimestampToDate(b.timestamp).getTime();
      return dateA - dateB;
    });
  }
  
  /**
   * Prüft, ob eine Nachricht an einem neuen Tag gesendet wurde.
   * @param currentMessage - Die aktuelle Nachricht.
   * @param previousMessage - Die vorherige Nachricht.
   * @returns `true`, wenn die aktuelle Nachricht an einem neuen Tag gesendet wurde, sonst `false`.
   */
  export function isNewDay(currentMessage: Message, previousMessage?: Message): boolean {
    if (!previousMessage || !previousMessage.timestamp || !currentMessage.timestamp) {
      return true;
    }
  
    const prevDate = convertTimestampToDate(previousMessage.timestamp);
    const currentDate = convertTimestampToDate(currentMessage.timestamp);
    return prevDate.toDateString() !== currentDate.toDateString();
  }