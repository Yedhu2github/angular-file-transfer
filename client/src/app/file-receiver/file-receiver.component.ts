import { THIS_EXPR } from '@angular/compiler/src/output/output_ast';
import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  Output,
  EventEmitter,
  ChangeDetectorRef,
} from '@angular/core';
import * as SimplePeer from 'simple-peer';
import * as streamSaver from 'streamsaver';
import { SocketService } from '../services/socket.service';

@Component({
  selector: 'app-file-receiver',
  templateUrl: './file-receiver.component.html',
  styleUrls: ['./file-receiver.component.scss'],
})
export class FileReceiverComponent implements OnInit, OnDestroy {
  constructor(
    private socketService: SocketService,
    private ref: ChangeDetectorRef
  ) {}
  receiver: any = {
    name: 'receiver',
    socketId: '',
  };
  room: any;
  connectionEstablished: boolean = false;
  fileStatus: string = 'pending';
  file: any;
  peerRef: any;
  fileNameRef: any;
  worker = new Worker(
    new URL('../web-workers/file-transfer.worker', import.meta.url)
  );
  ngOnInit(): void {
    this.worker.addEventListener('message', async (event) => {
      const stream = await event.data.stream();
      const fileStream = streamSaver.createWriteStream(this.fileNameRef);
      await stream.pipeTo(fileStream);
      this.cancel();
    });
    //socket io setup

    //socket io events
  }
  ngOnDestroy() {
    this.peerRef.destroy(['completed']);
    this.worker.terminate();
    console.log(caches.keys);
    caches.keys().then((names) => {
      for (let name of names) caches.delete(name);
    });
    this.progress = 0;
    this.percentage = 0;
  }
  @Input() set payload(val: any) {
    this.payloadRef = val;
    console.log('socket event => user joined -', val);
    this.peerRef = this.addPeer(val.signal, val.callerID);
    console.log('add peer executed');
  }
  payloadRef: any;
  signal: any;
  callerID: any;
  @Output() completed = new EventEmitter<any>();
  emitCompleted() {
    this.completed.emit(this.payloadRef);
  }
  detectChanges() {
    this.ref.detectChanges();
  }

  addPeer(incomingSignal: any, callerID: any) {
    console.log('addPeer() ==>', incomingSignal, '__  ', callerID);

    const peer = new SimplePeer({
      initiator: false,
      trickle: false,

      channelConfig: {
        reliable: true,
        ordered: true,
      },
    });

    peer.on('signal', (signal: any) => {
      console.log('peer event => signal, (add peer) -', signal);
      this.signal = signal;
      this.callerID = callerID;
    });

    peer.on('data', (data) => {
      this.handleReceivingData(data);
    });
    peer.on('error', (err) => {
      console.log(err);
    });

    peer.on('close', () => {
      console.log('closed');
    });

    peer.signal(incomingSignal);
    return peer;
  }

  async handleReceivingData(data: any) {
    if (data.toString().includes('doneSendingTheEntireFile')) {
      this.fileStatus = 'received';
      this.detectChanges();

      var parsed = JSON.parse(data);
      this.fileNameRef = parsed.fileNameRef;
      console.log(this.fileNameRef);

      this.peerRef.write('done');
    } else {
      this.progressBar(data.length);
      this.worker.postMessage(data);
    }
  }
  async download(download: boolean) {
    if (!download) {
      this.fileStatus = 'done';
      this.cancel();
    } else {
      this.fileStatus = 'done';
      await this.worker.postMessage('download');
    }
  }

  cancel() {
    this.emitCompleted();
  }
  done() {}
  receive(receive: boolean) {
    if (!receive) this.cancel();
    else {
      var signal = this.signal;
      var callerID = this.callerID;
    }
    this.socketService.socket.emit('returning signal', { signal, callerID });
  }
  returnFileSize() {
    if (this.payloadRef.file.size > 1_00_00_00_000)
      return `${(this.payloadRef.file.size / 10_00_00_000).toFixed(2)}GB`;
    else if (this.payloadRef.file.size > 10_00_000)
      return `${(this.payloadRef.file.size / 10_00_000).toFixed(2)}MB`;
    else return `${(this.payloadRef.file.size / 1000).toFixed(2)}KB`;
  }
  progress: number = 0;
  percentage: any = 0;
  async progressBar(chunkSize: any) {
    this.progress = this.progress + chunkSize;
    this.percentage = (this.progress / this.payloadRef.file.size) * 100;
    console.log(this.percentage);
    this.percentage = this.percentage.toFixed(2);
    console.log(this.percentage);
    this.detectChanges();
  }
}
