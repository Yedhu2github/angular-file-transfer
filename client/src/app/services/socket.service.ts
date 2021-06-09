import { analyzeAndValidateNgModules } from '@angular/compiler';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { io } from 'socket.io-client';

@Injectable({
  providedIn: 'root',
})
export class SocketService {
  constructor() {
    this.socket = io();
    this.init();
  }
  socket: any;
  init() {
    console.log(this.socket.id);
    this.fileUserListListener();
    this.fileReturnSignalListener();
    this.fileSignalEventListener();
  }
  fileUserListEvent: any;
  fileReturnSignalEvent: any;
  fileSignalEvent: any;
  fileUserListListener() {
    this.fileUserListEvent = new Observable<any>((listener: any) => {
      this.socket.on('all file receivers', (users: any[]) => {
        listener.next(users);
      });
    });
  }
  fileReturnSignalListener() {
    this.fileReturnSignalEvent = new Observable<any>((listener: any) => {
      this.socket.on(
        'receiving returned signal',
        (payload: { signal: any; callerID: any }) => {
          listener.next(payload);
        }
      );
    });

    this.socket.on('room full', () => {
      console.log('socket event => room full ');
      alert('room is full');
    });
  }
  fileSignalEventListener() {
    this.fileSignalEvent = new Observable<any>((listener: any) => {
      this.socket.on(
        'user joined',
        (payload: { signal: any; callerID: any; file: any }) => {
          listener.next(payload);
        }
      );
    });
  }
}
