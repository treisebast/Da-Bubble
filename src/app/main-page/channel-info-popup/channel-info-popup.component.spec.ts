import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChannelInfoPopupComponent } from './channel-info-popup.component';

describe('ChannelInfoPopupComponent', () => {
  let component: ChannelInfoPopupComponent;
  let fixture: ComponentFixture<ChannelInfoPopupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChannelInfoPopupComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ChannelInfoPopupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
