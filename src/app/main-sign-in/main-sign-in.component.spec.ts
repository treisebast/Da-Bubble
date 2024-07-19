import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MainSignInComponent } from './main-sign-in.component';

describe('MainSignInComponent', () => {
  let component: MainSignInComponent;
  let fixture: ComponentFixture<MainSignInComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MainSignInComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(MainSignInComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
