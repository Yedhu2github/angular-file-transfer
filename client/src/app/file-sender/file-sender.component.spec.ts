import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FileSenderComponent } from './file-sender.component';

describe('FileSenderComponent', () => {
  let component: FileSenderComponent;
  let fixture: ComponentFixture<FileSenderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FileSenderComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FileSenderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
