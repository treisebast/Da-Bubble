import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogOptionsComponent } from './dialog-options.component';

describe('DialogOptionsComponent', () => {
  let component: DialogOptionsComponent;
  let fixture: ComponentFixture<DialogOptionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DialogOptionsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DialogOptionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
