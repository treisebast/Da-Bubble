import { Injectable } from '@angular/core';
import { Firestore, collectionGroup, collectionData, query, where, orderBy, limit, startAt, endAt, collectionChanges, getDocs, Query } from '@angular/fire/firestore';
import { Message } from '../models/message.model';
import { forkJoin, map, Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SearchService {

  private readonly MAX_IN_VALUES = 10;
  constructor(private firestore: Firestore) {}

 /**
   * Searches messages based on the search query and chat IDs.
   * @param searchQuery - The user's search query.
   * @param chatIds - The IDs of the chats to search in.
   * @returns An Observable that contains an array of found messages.
   */
 searchMessages(searchQuery: string, chatIds: string[]): Observable<Message[]> {
  if (!this.isValidSearch(searchQuery, chatIds)) {
    return of([]);
  }

  const searchTerm = this.createSearchTerm(searchQuery);
  const batches = this.splitIntoBatches(chatIds, this.MAX_IN_VALUES);
  const queries = batches.map(batch => this.createQuery(batch, searchTerm));
  const observables = queries.map(q => this.executeQuery(q));

  return this.combineResults(observables);
}

/**
 * Checks if the search query and chat IDs are valid.
 * @param searchQuery - The user's search query.
 * @param chatIds - The IDs of the chats.
 * @returns A boolean indicating whether the inputs are valid.
 */
private isValidSearch(searchQuery: string, chatIds: string[]): boolean {
  return !!searchQuery && searchQuery.trim() !== '' && !!chatIds && chatIds.length > 0;
}

/**
 * Creates a search term in lowercase.
 * @param searchQuery - The original search query.
 * @returns The search term converted to lowercase.
 */
private createSearchTerm(searchQuery: string): string {
  return searchQuery.toLowerCase();
}

/**
 * Splits the chat IDs into batches, as Firestore 'in' only supports a maximum of 10 values.
 * @param chatIds - The IDs of the chats.
 * @param batchSize - The maximum size of a batch.
 * @returns An array of chat ID batches.
 */
private splitIntoBatches(chatIds: string[], batchSize: number): string[][] {
  const batches: string[][] = [];
  for (let i = 0; i < chatIds.length; i += batchSize) {
    batches.push(chatIds.slice(i, i + batchSize));
  }
  return batches;
}

/**
 * Creates a Firestore query for a batch of chat IDs.
 * @param batch - A batch of chat IDs.
 * @param searchTerm - The search term in lowercase.
 * @returns The created Firestore query.
 */
private createQuery(batch: string[], searchTerm: string): Query {
  return query(
    collectionGroup(this.firestore, 'messages'),
    where('chatId', 'in', batch),
    where('content_lowercase', '>=', searchTerm),
    where('content_lowercase', '<=', searchTerm + '\uf8ff'),
    orderBy('content_lowercase'),
    limit(10)
  );
}

/**
 * Executes a Firestore query and converts the results into a Message array.
 * @param q - The Firestore query.
 * @returns An Observable that contains an array of messages.
 */
private executeQuery(q: Query): Observable<Message[]> {
  return new Observable<Message[]>(observer => {
    getDocs(q).then(snapshot => {
      const messages: Message[] = [];
      snapshot.forEach(doc => {
        const data = doc.data() as Message;
        data.id = doc.id;
        messages.push(data);
      });
      observer.next(messages);
      observer.complete();
    }).catch(error => {
      console.error('Fehler bei der Suchabfrage:', error);
      observer.error(error);
    });
  });
}

/**
 * Combines multiple message Observables into a single Observable.
 * @param observables - An array of Observables, each containing an array of messages.
 * @returns An Observable that contains a flat array of messages.
 */
private combineResults(observables: Observable<Message[]>[]): Observable<Message[]> {
  if (observables.length === 0) {
    return of([]);
  }

  return forkJoin(observables).pipe(
    map(results => results.flat())
  );
}
}
