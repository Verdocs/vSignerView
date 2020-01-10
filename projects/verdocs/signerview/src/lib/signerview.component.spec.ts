import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SignerviewComponent } from './signerview.component';

describe('SignerviewComponent', () => {
  let component: SignerviewComponent;
  let fixture: ComponentFixture<SignerviewComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SignerviewComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SignerviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
