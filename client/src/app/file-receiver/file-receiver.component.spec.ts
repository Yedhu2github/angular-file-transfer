import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FileReceiverComponent } from './file-receiver.component';

describe('FileReceiverComponent', () => {
  let component: FileReceiverComponent;
  let fixture: ComponentFixture<FileReceiverComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FileReceiverComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FileReceiverComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
