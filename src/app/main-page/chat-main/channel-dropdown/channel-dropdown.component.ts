import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, QueryList, ViewChildren, ElementRef } from '@angular/core';
import { Channel } from '../../../shared/models/channel.model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-channel-dropdown',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './channel-dropdown.component.html',
  styleUrls: ['./channel-dropdown.component.scss']
})
export class ChannelDropdownComponent implements OnInit, OnChanges {
  @Input() channels: Channel[] = [];
  @Input() searchTerm: string = '';
  @Output() channelSelected = new EventEmitter<Channel>();

  filteredChannels: Channel[] = [];
  selectedIndex: number = -1;

  @ViewChildren('channelItem') channelItems!: QueryList<ElementRef>;

  ngOnInit() {
    this.filterChannels();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['searchTerm']) {
      this.filterChannels();
    }
  }

  filterChannels() {
    if (this.searchTerm && this.searchTerm.length > 0) {
      const term = this.searchTerm.toLowerCase();
      this.filteredChannels = this.channels.filter(channel => channel.name?.toLowerCase().includes(term));
    } else {
      this.filteredChannels = [...this.channels];
    }
    this.selectedIndex = -1;
  }

  selectChannel(channel: Channel) {
    this.channelSelected.emit(channel);
  }

  moveSelectionDown() {
    if (this.selectedIndex < this.filteredChannels.length - 1) {
      this.selectedIndex++;
    } else {
      this.selectedIndex = 0;
    }
    this.scrollToSelected();
  }

  moveSelectionUp() {
    if (this.selectedIndex > 0) {
      this.selectedIndex--;
    } else {
      this.selectedIndex = this.filteredChannels.length - 1;
    }
    this.scrollToSelected();
  }

  getSelectedChannel(): Channel | null {
    if (this.selectedIndex >= 0 && this.selectedIndex < this.filteredChannels.length) {
      return this.filteredChannels[this.selectedIndex];
    }
    return null;
  }

  private scrollToSelected() {
    if (this.channelItems && this.channelItems.toArray()[this.selectedIndex]) {
      const element = this.channelItems.toArray()[this.selectedIndex].nativeElement;
      element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }
}
