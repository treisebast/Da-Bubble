import { ElementRef, Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ScrollService {

  /**
   * Smoothly scrolls to the bottom of the main chat container.
   * @param {ElementRef} container - The main chat container to scroll.
   * @returns {void}
   */
  scrollToBottomOfMainChat(container: ElementRef): void {
    setTimeout(() => {
      container.nativeElement.scrollTo({
        top: container.nativeElement.scrollHeight,
        behavior: 'smooth',
      });
    }, 300);
  }

  /**
   * Smoothly scrolls to the bottom of the thread container.
   * @param {ElementRef} container - The thread container to scroll.
   * @returns {void}
   */
  scrollToBottomOfThread(container: ElementRef): void {
    setTimeout(() => {
      container.nativeElement.scrollTo({
        top: container.nativeElement.scrollHeight,
        behavior: 'smooth',
      });
    }, 300);
  }

  /**
   * Scrolls to a specific message by its ID and highlights it if found.
   * @param {string} messageId - The ID of the message to scroll to.
   * @returns {void}
   */
  scrollToMessage(messageId: string): void {
    setTimeout(() => {
      const messageElement = document.getElementById(messageId);
      if (messageElement) {
        this.highlightAndScrollToMessage(messageElement);
      } else {
        this.waitForMessageElement(messageId);
      }
    }, 500);
  }


  /**
 * Waits for a message element to be available in the DOM, then scrolls to and highlights it.
 * @private
 * @param {string} messageId - The ID of the message to wait for.
 * @returns {void}
 */
  private waitForMessageElement(messageId: string): void {
    const checkExist = setInterval(() => {
      const messageElement = document.getElementById(messageId);
      if (messageElement) {
        this.highlightAndScrollToMessage(messageElement);
        clearInterval(checkExist);
      }
    }, 100);

    setTimeout(() => clearInterval(checkExist), 5000);
  }

  /**
   * Smoothly scrolls to a message element and temporarily highlights it.
   * @private
   * @param {HTMLElement} element - The message element to scroll to and highlight.
   * @returns {void}
   */
  private highlightAndScrollToMessage(element: HTMLElement): void {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    element.classList.add('highlight');
    setTimeout(() => {
      element.classList.remove('highlight');
    }, 3000);
  }
}