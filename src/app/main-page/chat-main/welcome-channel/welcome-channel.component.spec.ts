import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WelcomeChannelComponent } from './welcome-channel.component';

describe('WelcomeChannelComponent', () => {
  let component: WelcomeChannelComponent;
  let fixture: ComponentFixture<WelcomeChannelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WelcomeChannelComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(WelcomeChannelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
