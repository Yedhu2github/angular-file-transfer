import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { TransferComponent } from './transfer/transfer.component';
import { NgbModule, NgbProgressbarModule } from '@ng-bootstrap/ng-bootstrap';
import { FileSenderComponent } from './file-sender/file-sender.component';
import { FileReceiverComponent } from './file-receiver/file-receiver.component';
import { MainComponent } from './main/main.component';

@NgModule({
  declarations: [AppComponent, TransferComponent, FileSenderComponent, FileReceiverComponent, MainComponent],
  imports: [BrowserModule, AppRoutingModule, NgbModule],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
