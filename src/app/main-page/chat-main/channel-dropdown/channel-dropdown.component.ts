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
  filteredChannels: Channel[] = [];
  selectedIndex: number = -1;
  @Input() channels: Channel[] = [];
  @Input() searchTerm: string = '';
  @Output() channelSelected = new EventEmitter<Channel>();
  @ViewChildren('channelItem') channelItems!: QueryList<ElementRef>;


  /**
 * Lifecycle hook that is called after data-bound properties are initialized.
 * Initializes the filtering of channels.
 */
  ngOnInit() {
    this.filterChannels();
  }


  /**
  * Lifecycle hook that is called when any data-bound property changes.
  * @param changes - Object of changed properties
  */
  ngOnChanges(changes: SimpleChanges) {
    if (changes['searchTerm']) {
      this.filterChannels();
    }
  }


  /**
    * Filters the channels based on the current search term.
    * If no search term is provided, all channels are displayed.
    */
  filterChannels() {
    if (this.searchTerm && this.searchTerm.length > 0) {
      const term = this.searchTerm.toLowerCase();
      this.filteredChannels = this.channels.filter(channel => channel.name?.toLowerCase().includes(term));
    } else {
      this.filteredChannels = [...this.channels];
    }
    this.selectedIndex = -1;
  }


  /**
   * Emits the selected channel through the `channelSelected` event.
   * @param channel - The channel that was selected
   */
  selectChannel(channel: Channel) {
    this.channelSelected.emit(channel);
  }


  /**
   * Moves the selection down to the next channel in the list.
   * If the end of the list is reached, wraps around to the first channel.
   */
  moveSelectionDown() {
    if (this.selectedIndex < this.filteredChannels.length - 1) {
      this.selectedIndex++;
    } else {
      this.selectedIndex = 0;
    }
    this.scrollToSelected();
  }


  /**
   * Moves the selection up to the previous channel in the list.
   * If the beginning of the list is reached, wraps around to the last channel.
   */
  moveSelectionUp() {
    if (this.selectedIndex > 0) {
      this.selectedIndex--;
    } else {
      this.selectedIndex = this.filteredChannels.length - 1;
    }
    this.scrollToSelected();
  }


  /**
   * Retrieves the currently selected channel.
   * @returns The selected channel or `null` if no channel is selected
   */
  getSelectedChannel(): Channel | null {
    if (this.selectedIndex >= 0 && this.selectedIndex < this.filteredChannels.length) {
      return this.filteredChannels[this.selectedIndex];
    }
    return null;
  }


  /**
   * Scrolls the view to ensure the selected channel is visible.
   * This method is private and used internally within the component.
   */
  private scrollToSelected() {
    if (this.channelItems && this.channelItems.toArray()[this.selectedIndex]) {
      const element = this.channelItems.toArray()[this.selectedIndex].nativeElement;
      element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }
}
