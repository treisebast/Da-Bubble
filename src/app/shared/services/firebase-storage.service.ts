import { Injectable } from '@angular/core';
import { Storage, ref, uploadBytes, getDownloadURL, getMetadata, deleteObject } from '@angular/fire/storage';
import { Observable, catchError, from, switchMap, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FirebaseStorageService {
  constructor(private storage: Storage) { }

  /**
    * Uploads a file to the specified path in Firebase Storage and returns an observable
    * that emits the download URL of the uploaded file.
    * @param {File} file - The file to be uploaded.
    * @param {string} filePath - The path in Firebase Storage where the file should be uploaded.
    * @returns {Observable<string>} An observable that emits the download URL of the uploaded file.
    */
  uploadFile(file: File, filePath: string): Observable<string> {
    const fileName = file.name;
    const storageRef = ref(this.storage, `${filePath}/${fileName}`);
    return from(uploadBytes(storageRef, file)).pipe(
      switchMap(() => from(getDownloadURL(storageRef)))
    );
  }

  /**
   * Deletes a file stored at the specified path in Firebase Storage.
   * @param {string} filePath - The path in Firebase Storage of the file to be deleted.
   * @returns {Observable<void>} An observable that completes when the file has been deleted.
   */
  deleteFile(filePath: string): Observable<void> {
    const fileRef = ref(this.storage, filePath);
    return from(deleteObject(fileRef));
  }

  /**
   * Retrieves the download URL of a file stored at the specified path in Firebase Storage.
   * @param {string} filePath - The path in Firebase Storage of the file whose URL is to be retrieved.
   * @returns {Observable<string>} An observable that emits the download URL of the file.
   */
  getFileUrl(filePath: string): Observable<string> {
    const storageRef = ref(this.storage, filePath);
    return from(getDownloadURL(storageRef));
  }



  /**
 * Retrieves the metadata of a file stored at the specified path in Firebase Storage.
 *
 * @param {string} filePath - The path in Firebase Storage of the file whose metadata is to be retrieved.
 * @returns {Observable<any>} An observable that emits the metadata of the file.
 */
  getFileMetadata(filePath: string): Observable<any> {
    const storageRef = ref(this.storage, filePath);
    return from(getMetadata(storageRef)).pipe(
      catchError(error => {
        return throwError(error);
      })
    );
  }
}