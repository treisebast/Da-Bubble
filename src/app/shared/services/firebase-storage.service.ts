import { Injectable } from '@angular/core';
import { Storage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';
import { Observable, from, switchMap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FirebaseStorageService {
  constructor(private storage: Storage) { }


  /**
    * Uploads a file to the specified path in Firebase Storage and returns an observable
    * that emits the download URL of the uploaded file.
    *
    * @param {File} file - The file to be uploaded.
    * @param {string} filePath - The path in Firebase Storage where the file should be uploaded.
    * @returns {Observable<string>} An observable that emits the download URL of the uploaded file.
    */
  uploadFile(file: File, filePath: string): Observable<string> {
    const storageRef = ref(this.storage, filePath);
    return from(uploadBytes(storageRef, file)).pipe(
      switchMap(() => from(getDownloadURL(storageRef)))
    );
  }


  /**
   * Retrieves the download URL of a file stored at the specified path in Firebase Storage.
   *
   * @param {string} filePath - The path in Firebase Storage of the file whose URL is to be retrieved.
   * @returns {Observable<string>} An observable that emits the download URL of the file.
   */
  getFileUrl(filePath: string): Observable<string> {
    const storageRef = ref(this.storage, filePath);
    return from(getDownloadURL(storageRef));
  }
}