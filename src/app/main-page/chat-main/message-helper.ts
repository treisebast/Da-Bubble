import { Message } from '../../shared/models/message.model';
import { Observable, forkJoin, of } from 'rxjs';
import { FirebaseStorageService } from '../../shared/services/firebase-storage.service';
import { map } from 'rxjs/operators';

export function loadMetadataForMessage(
  message: Message,
  firebaseStorageService: FirebaseStorageService
): Observable<Message> {
  if (message.attachments?.length) {
    const metadataRequests = message.attachments.map((attachment) =>
      firebaseStorageService.getFileMetadata(attachment)
    );

    return forkJoin(metadataRequests).pipe(
      map((metadataArray) => {
        message.metadata = {};
        metadataArray.forEach((metadata, index) => {
          message.metadata![message.attachments![index]] = {
            name: metadata.name,
            size: metadata.size,
          };
        });
        return message;
      })
    );
  } else {
    return of(message);
  }
}
