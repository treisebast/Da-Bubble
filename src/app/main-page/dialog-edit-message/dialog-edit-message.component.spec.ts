import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DialogEditMessageComponent } from './dialog-edit-message.component';

describe('DialogEditMessageComponent', () => {
  let component: DialogEditMessageComponent;
  let fixture: ComponentFixture<DialogEditMessageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DialogEditMessageComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DialogEditMessageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
