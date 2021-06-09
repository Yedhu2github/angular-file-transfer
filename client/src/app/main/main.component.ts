import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { SocketService } from '../services/socket.service';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss'],
})
export class MainComponent implements OnInit, OnDestroy {
  constructor(private socket: SocketService, private ref: ChangeDetectorRef) {}
  ngOnInit(): void {
    this.getFiles();
    this.socket.init();
  }
  ngOnDestroy() {
    this.fileSignalEvent.unsubscribe();
  }

  detectChanges() {
    this.ref.detectChanges();
  }
  filesArray: any[] = [];
  fileSignalEvent: any;
  getFiles() {
    this.fileSignalEvent = this.socket.fileSignalEvent;
    this.fileSignalEvent.subscribe((event: any) => {
      console.log(event);
      this.filesArray.push(event);
      this.detectChanges();
    });
  }
  completed(data: any) {
    this.filesArray = this.filesArray.filter((payload) => payload !== data);
    this.detectChanges();
  }
  value: any;
  inputChanged(val: any) {
    this.value = val;
    this.detectChanges();
  }
}
