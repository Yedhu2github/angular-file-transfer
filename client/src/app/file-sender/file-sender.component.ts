import { PipeResolver } from '@angular/compiler';
import {
  ChangeDetectorRef,
  Component,
  Input,
  OnDestroy,
  OnInit,
} from '@angular/core';
import * as SimplePeer from 'simple-peer';
import * as streamSaver from 'streamsaver';
import { SocketService } from '../services/socket.service';
@Component({
  selector: 'app-file-sender',
  templateUrl: './file-sender.component.html',
  styleUrls: ['./file-sender.component.scss'],
})
export class FileSenderComponent implements OnInit, OnDestroy {
  constructor(
    private socketService: SocketService,
    private ref: ChangeDetectorRef
  ) {}
  peerStatus: string = 'waiting';
  file: any;
  peersRef: any[] = [];
  peerRef: any;
  fileNameRef: any;
  receiver: any;
  @Input() set fileReceiver(val: any) {
    this.receiver = val;
  }
  ngOnInit(): void {
    //userListEvent
    this.fileUserListEvent = this.socketService.fileUserListEvent;
    this.socketService.fileUserListEvent.subscribe((users: any) => {
      console.log('socket event => all users', users);
      users.forEach((user: any) => {
        console.log(user);

        var peer = this.createPeer(user, this.socketService.socket.id);
        var peerRef = {
          user: user,
          peer: peer,
          ready: false,
        };

        this.peersRef.push(peerRef);
      });
    });
    //returnSignalEvent
    this.fileReturnSignalEvent = this.socketService.fileReturnSignalEvent;
    this.socketService.fileReturnSignalEvent.subscribe((payload: any) => {
      const { signal, id } = payload;
      console.log('socket event => receiving returned signal -', payload);
      console.log(this.peersRef);

      var peerRef = this.peersRef.find((peer: any) => {
        if (peer.user == id) return true;
        else return false;
      });
      peerRef.peer.signal(payload.signal);
      var newPeers = this.peersRef.map((peer) => {
        if (peer == peerRef) peer.ready = true;
        return peer;
      });
      this.peersRef = newPeers;

      this.peerStatus = 'pending';
    });
  }
  returnReadyCount() {
    var count = 0;
    if (this.peersRef) {
      for (let peer of this.peersRef) {
        if (peer) if (peer.ready == true) count++;
      }
      return count;
    } else return 0;
  }
  ngOnDestroy() {
    this.fileReturnSignalEvent.unsubscribe();
    this.fileUserListEvent.unsubscribe();
  }
  fileReturnSignalEvent: any;
  fileUserListEvent: any;

  createPeer(userToSignal: any, callerID: any) {
    var peer = new SimplePeer({
      initiator: true,
      trickle: false,
      channelConfig: {
        reliable: true,
        ordered: true,
      },
    });
    console.log(
      'createPeer() userToSignal: ==>',
      userToSignal,
      'callerID ==>',
      callerID
    );

    peer.on('signal', (signal: any) => {
      console.log('peer event => signal -', signal);
      var file = {
        name: this.file.name,
        size: this.file.size,
        callerID: this.receiver,
      };
      this.socketService.socket.emit('sending signal', {
        userToSignal,
        callerID,
        signal,
        file,
      });
    });

    peer.on('data', (data) => {
      console.log('data');

      this.handleReceivingData(data);
    });

    peer.on('error', (err) => {
      console.log(err);
      //  this.peerRef.destroy();

      this.peerStatus = 'waiting';
      //    this.socketServiceRef.off();
    });
    peer.on('close', () => {
      console.log('closed');
      //  this.peerRef.destroy();

      this.peerStatus = 'waiting';
      //     this.socketServiceRef.off();
    });
    return peer;
  }
  selectFile(e: any) {
    this.file = e.target.files[0];
    this.fileNameRef = this.file.name;
  }

  async send() {
    if (this.file)
      await this.socketService.socket.emit('join room', this.receiver);
    else alert('Select a file to send');
  }

  confirm(val: boolean) {
    if (val)
      this.peersRef.forEach((peer) => {
        this.sendFile(peer.peer);
      });
    else return;
  }
  async sendFile(peer: any) {
    if (!this.file) return;
    var stream = this.file.stream();
    var reader = stream.getReader();
    console.log('size =>', this.file.size);
    const fileSize = this.file.size;
    var delay = (ms: number) => new Promise((_) => setTimeout(_, ms));

    var handleReading = async (done: any, value: any) => {
      console.log('called handleReading');
      if (done) {
        console.log(done);
        await delay(200);

        await peer.write(
          JSON.stringify({
            doneSendingTheEntireFile: true,
            fileNameRef: this.file.name,
          })
        );

        this.peersRef = this.peersRef.map((peerElement) => {
          if (peerElement.peer == peer) peerElement.ready = false;
          return peerElement;
        });

        return;
      } else {
        console.log(value.length);
        var offset = 0;
        const chunkSize = 260000;
        var chunk: any;
        if (value.length > chunkSize) {
          var convertIntoChunks = async (array: any) => {
            console.log(array.length, '==', offset);
            if (chunkSize < array.length - offset) {
              chunk = array.slice(offset, offset + chunkSize);
              console.log(chunk);
              offset = offset + chunkSize;
              await delay(200);

              await peer.write(chunk);
              this.progressBar(fileSize, chunk.length);
              await convertIntoChunks(array);
            } else {
              console.log(array.length, '-', offset, '=', array.length);
              chunk = array.slice(offset, array.length);
              console.log(chunk.length);

              await delay(200);
              await peer.write(chunk);
              this.progressBar(fileSize, chunk.length);

              return;
            }
          };
          await convertIntoChunks(value);
        } else {
          await delay(200);
          await peer.write(value);
          this.progressBar(fileSize, value.length);
        }

        reader.read().then(async (obj: { done: any; value: any }) => {
          await handleReading(obj.done, obj.value);
        });
      }
      return;
    };
    reader
      .read()
      .then(async (obj: { done: any; value: any }) => {
        await handleReading(obj.done, obj.value);
      })
      .catch((err: any) => {
        console.log(err);
      });
    return;
  }

  detectChanges() {
    this.ref.detectChanges();
  }
  handleReceivingData(data: any) {
    console.log(data);

    if (data.toString() == 'done') this.cancel();
  }
  async cancel() {
    this.peerStatus = 'waiting';
    this.detectChanges();

    console.log(this.peersRef);
    var check;
    await this.peersRef.forEach((peer) => {
      if (!peer.ready) {
        check = !peer.ready;
        peer.peer.destroy('completed');
      }
    });

    if (check) {
      console.log(caches.keys);
      await caches.keys().then((names) => {
        for (let name of names) caches.delete(name);
      });
      this.peerRef = null;
      this.percentage = 0;
      this.progress = 0;
      this.peersRef = [];
    }
  }

  progress: number = 0;
  percentage: any = 0;
  progressBar(totalSize: number, chunkSize: any) {
    this.progress = this.progress + chunkSize;
    this.percentage = (this.progress / totalSize) * 100;
    this.percentage = this.percentage.toFixed(2);
  }
}
