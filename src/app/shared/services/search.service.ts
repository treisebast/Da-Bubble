import { Injectable } from '@angular/core';
import { Firestore, collectionGroup, collectionData, query, where, orderBy, limit, startAt, endAt, collectionChanges } from '@angular/fire/firestore';
import { Message } from '../models/message.model';
import { map, Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SearchService {
  constructor(private firestore: Firestore) {}

  searchMessages(searchQuery: string): Observable<Message[]> {
    if (!searchQuery || searchQuery.trim() === '') {
      return of([]);
    }
  
    const searchTerm = searchQuery.toLowerCase();
  
    const messagesCollectionGroup = collectionGroup(this.firestore, 'messages');
    const messagesQuery = query(
      messagesCollectionGroup,
      orderBy('content_lowercase'),
      startAt(searchTerm),
      endAt(searchTerm + '\uf8ff'),
      limit(10)
    );
  
    return collectionChanges(messagesQuery).pipe(
      map(actions => actions.map(a => {
        const data = a.doc.data() as Message;
        data.id = a.doc.id;
        return data;
      }))
    );
  }
}
