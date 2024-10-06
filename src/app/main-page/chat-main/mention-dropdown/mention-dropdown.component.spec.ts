import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MentionDropdownComponent } from './mention-dropdown.component';

describe('MentionDropdownComponent', () => {
  let component: MentionDropdownComponent;
  let fixture: ComponentFixture<MentionDropdownComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MentionDropdownComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(MentionDropdownComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
