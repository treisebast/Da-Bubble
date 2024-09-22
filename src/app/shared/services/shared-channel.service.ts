import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Channel } from '../models/channel.model';

@Injectable({
  providedIn: 'root',
})
export class SharedChannelService {
  private privateChannelsSource = new BehaviorSubject<Channel[]>([]);
  privateChannels$ = this.privateChannelsSource.asObservable();

  private publicChannelsSource = new BehaviorSubject<Channel[]>([]);
  publicChannels$ = this.publicChannelsSource.asObservable();

  setPrivateChannels(channels: Channel[]) {
    this.privateChannelsSource.next(channels);
  }

  getPrivateChannels() {
    return this.privateChannelsSource.value;
  }

  setPublicChannels(channels: Channel[]) {
    this.publicChannelsSource.next(channels);
  }

  getPuplicChannels() {
    return this.publicChannelsSource.value;
  }
}
