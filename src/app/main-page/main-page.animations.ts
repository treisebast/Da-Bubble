import { trigger, state, style, transition, animate } from '@angular/animations';

export const slideInOut = trigger('slideInOut', [
  state(
    'in',
    style({
      width: '20%',
      minWidth: '348px',
      opacity: 1,
      margin: '8px',
      padding: '16px',
      transform: 'translateX(0)',
    })
  ),
  state(
    'out',
    style({
      width: '0%',
      minWidth: '0px',
      opacity: 0,
      margin: '0px',
      padding: '0px',
      transform: 'translateX(-100%)',
    })
  ),
  transition('in => out', animate('150ms ease-in-out')),
  transition('out => in', animate('150ms ease-in-out')),
]);

export const slideInOutRight = trigger('slideInOutRight', [
  transition(':enter', [
    style({
      width: '0%',
      minWidth: '0px',
      opacity: 0,
      margin: '0px',
      padding: '0px',
      transform: 'translateX(100%)',
    }),
    animate(
      '150ms ease-in-out',
      style({
        width: '20%',
        minWidth: '348px',
        opacity: 1,
        margin: '8px',
        padding: '16px',
        transform: 'translateX(0)',
      })
    ),
  ]),
  transition(':leave', [
    animate(
      '150ms ease-in-out',
      style({
        width: '0%',
        minWidth: '0px',
        opacity: 0,
        margin: '0px',
        padding: '0px',
        transform: 'translateX(100%)',
      })
    ),
  ]),
]);
