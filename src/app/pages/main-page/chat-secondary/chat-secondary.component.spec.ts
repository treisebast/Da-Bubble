import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChatSecondaryComponent } from './chat-secondary.component';

describe('ChatSecondaryComponent', () => {
  let component: ChatSecondaryComponent;
  let fixture: ComponentFixture<ChatSecondaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatSecondaryComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ChatSecondaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
