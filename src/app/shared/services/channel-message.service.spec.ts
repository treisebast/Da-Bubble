import { TestBed } from '@angular/core/testing';

import { ChannelMessageService } from './chat-service.service';

describe('ChannelMessageService', () => {
  let service: ChannelMessageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ChannelMessageService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
