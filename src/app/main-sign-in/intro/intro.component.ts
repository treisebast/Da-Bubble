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
          .catch(error => console.error('Animation error:', error));
    }, 750);
  }

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
