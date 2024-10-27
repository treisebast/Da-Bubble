import { ElementRef, Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ScrollService {
  
  scrollToBottomOfMainChat(container: ElementRef): void {
    setTimeout(() => {
      container.nativeElement.scrollTo({
        top: container.nativeElement.scrollHeight,
        behavior: 'smooth',
      });
    }, 300);
  }

  scrollToBottomOfThread(container: ElementRef): void {
    setTimeout(() => {
      container.nativeElement.scrollTo({
        top: container.nativeElement.scrollHeight,
        behavior: 'smooth',
      });
    }, 300);
  }

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

  private highlightAndScrollToMessage(element: HTMLElement): void {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    element.classList.add('highlight');
    setTimeout(() => {
      element.classList.remove('highlight');
    }, 3000);
  }
}