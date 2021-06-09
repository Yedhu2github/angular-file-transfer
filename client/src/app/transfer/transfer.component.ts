import { Component, OnInit, Inject, Injectable } from '@angular/core';
import * as SimplePeer from 'simple-peer';
import * as streamSaver from 'streamsaver';
import { io } from 'socket.io-client';

@Component({
  selector: 'app-transfer',
  templateUrl: './transfer.component.html',
  styleUrls: ['./transfer.component.scss'],
})
@Injectable()
export class TransferComponent implements OnInit {
  constructor() {}
  receiver: any = {
    name: 'receiver',
    socketId: '',
  };
  room: any;
  roomID: any = '/room/test1';
  connectionEstablished: boolean = false;
  fileStatus: string = 'pending';
  file: any;
  chunksRef: any[] = [];
  socketRef: any;
  peersRef: any[] = [];
  peerRef: any;
  fileNameRef: any;
  worker = new Worker(
    new URL('../web-workers/file-transfer.worker', import.meta.url)
  );
  ngOnInit(): void {
    this.worker.addEventListener('message', (event) => {
      const stream = event.data.stream();
      const fileStream = streamSaver.createWriteStream(this.fileNameRef);
      stream.pipeTo(fileStream);
    });
    //socket io setup
    this.socketRef = io();
    this.socketRef.emit('join room', this.roomID);
    //socket io events
    this.socketRef.on('all users', (users: any[]) => {
      console.log('socket event => all users', users);

      this.peerRef = this.createPeer(users[0], this.socketRef.id);
    });

    this.socketRef.on(
      'user joined',
      (payload: { signal: any; callerID: any }) => {
        console.log('socket event => user joined -', payload);

        this.peerRef = this.addPeer(payload.signal, payload.callerID);
        console.log('add peer executed');
      }
    );

    this.socketRef.on(
      'receiving returned signal',
      (payload: { signal: any }) => {
        console.log('socket event => receiving returned signal -', payload);

        this.peerRef.signal(payload.signal);
        //  this.peerRef.write('connected');

        this.connectionEstablished = true;
      }
    );

    this.socketRef.on('room full', () => {
      console.log('socket event => room full ');

      alert('room is full');
    });
  }

  joinRoom() {
    this.socketRef.emit('join room', this.roomID);
    //socket io events
    this.socketRef.on('all users', (users: any[]) => {
      console.log('socket event => all users', users);

      this.peerRef = this.createPeer(users[0], this.socketRef.id);
    });

    this.socketRef.on(
      'user joined',
      (payload: { signal: any; callerID: any }) => {
        console.log('socket event => user joined -', payload);

        this.peerRef = this.addPeer(payload.signal, payload.callerID);
        console.log('add peer executed');
      }
    );

    this.socketRef.on(
      'receiving returned signal',
      (payload: { signal: any }) => {
        console.log('socket event => receiving returned signal -', payload);

        this.peerRef.signal(payload.signal);
        this.peerRef.write('connected');

        this.connectionEstablished = true;
      }
    );

    this.socketRef.on('room full', () => {
      console.log('socket event => room full ');

      alert('room is full');
    });
  }

  exitRoom() {
    this.peerRef.destroy(['user exited from room']);
    this.socketRef.off();
  }

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

      this.socketRef.emit('sending signal', {
        userToSignal,
        callerID,
        signal,
      });
    });

    peer.on('data', (data) => {
      console.log('data');

      this.handleReceivingData(data);
    });

    peer.on('error', (err) => {
      console.error(err);
      //  this.peerRef.destroy();

      this.connectionEstablished = false;
      this.socketRef.off();
    });
    peer.on('close', () => {
      console.log('failed to send retry');
      //  this.peerRef.destroy();

      this.connectionEstablished = false;
      this.socketRef.off();
    });
    return peer;
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

      this.socketRef.emit('returning signal', { signal, callerID });
    });

    peer.on('data', (data) => {
      this.handleReceivingData(data);
    });
    peer.on('error', (err) => {
      console.error(err);
      this.connectionEstablished = false;
    });

    peer.on('close', () => {
      console.log('failed to send retry');
      this.connectionEstablished = false;
    });

    peer.signal(incomingSignal);
    this.connectionEstablished = true;
    return peer;
  }

  handleReceivingData(data: any) {
    if (data.toString().includes('doneSendingTheEntireFile')) {
      this.fileStatus = 'processing';
      var parsed = JSON.parse(data);
      this.fileNameRef = parsed.fileNameRef;
      console.log(this.fileNameRef);
    } else {
      this.worker.postMessage(data);
    }
  }

  download(download: boolean) {
    if (!download) return (this.fileStatus = 'done');

    this.fileStatus = 'done';
    this.worker.postMessage('download');
    return;
  }
  selectFile(e: any) {
    this.file = e.target.files[0];
  }
  async sendFile() {
    if (!this.file) return;
    var stream = this.file.stream();
    var reader = stream.getReader();
    var peer = this.peerRef;

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
              await convertIntoChunks(array);
            } else {
              console.log(array.length, '-', offset, '=', array.length);
              chunk = array.slice(offset, array.length);
              console.log(chunk.length);

              await delay(200);
              await peer.write(chunk);
              return;
            }
          };
          await convertIntoChunks(value);
        } else {
          await delay(200);
          await peer.write(value);
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
  cancel() {}
  done() {}
  receive(receive: boolean) {}
}
