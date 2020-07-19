import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ListSymbiosUserComponent } from './list-symbios-user.component';

describe('ListSymbiosUserComponent', () => {
  let component: ListSymbiosUserComponent;
  let fixture: ComponentFixture<ListSymbiosUserComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ListSymbiosUserComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ListSymbiosUserComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
