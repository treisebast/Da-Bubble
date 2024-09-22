import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogShowMembersComponent } from './dialog-show-members.component';

describe('DialogShowMembersComponent', () => {
  let component: DialogShowMembersComponent;
  let fixture: ComponentFixture<DialogShowMembersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DialogShowMembersComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DialogShowMembersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
