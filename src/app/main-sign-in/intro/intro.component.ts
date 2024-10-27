import { Component, EventEmitter, OnInit, Output, Renderer2, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-intro',
  standalone: true,
  templateUrl: './intro.component.html',
  styleUrls: ['./intro.component.scss'],
  imports: [CommonModule]
})
export class IntroComponent implements OnInit {
  @Output() introComplete = new EventEmitter<boolean>();

  constructor(private renderer: Renderer2, private el: ElementRef) { }


  /**
 * Lifecycle hook that is called after data-bound properties are initialized.
 * Starts the introduction animation sequence after a short delay.
 */
  ngOnInit(): void {
    const logo = this.el.nativeElement.querySelector('.logo');
    const text = this.el.nativeElement.querySelector('.logo-text span');
    const background = this.el.nativeElement.querySelector('.background');
    setTimeout(() => {
      this.startAnimation(logo, 'logo-animate', 400)
        .then(() => this.startAnimation(text, 'text-animate', 1250))
        .then(() => Promise.all([
          this.startAnimation(background, 'background-animate', 800),
          this.startAnimation(logo, 'logo-top-left', 800)
        ]))
        .then(() => {
          this.renderer.addClass(logo, 'hidden');
          this.renderer.addClass(text, 'hidden');
          this.renderer.addClass(background, 'hidden');
          this.introComplete.emit(true);
        })
    }, 750);
  }


  /**
 * Starts an animation by adding a specified CSS class to an element after a delay.
 * @param element - The DOM element to animate
 * @param animationClass - The CSS class that triggers the animation
 * @param duration - The duration of the animation in milliseconds
 * @returns A promise that resolves after the animation duration
 */
  startAnimation(element: any, animationClass: string, duration: number): Promise<void> {
    return new Promise((resolve, reject) => {
      if (element) {
        this.renderer.addClass(element, animationClass);
        setTimeout(() => {
          resolve();
        }, duration);
      } else {
        reject(`Element not found for animation: ${animationClass}`);
      }
    });
  }
}
