import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChatMainComponent } from './chat-main.component';

describe('ChatMainComponent', () => {
  let component: ChatMainComponent;
  let fixture: ComponentFixture<ChatMainComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatMainComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ChatMainComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
