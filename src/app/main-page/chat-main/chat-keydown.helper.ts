import { MentionDropdownComponent } from './mention-dropdown/mention-dropdown.component';
import { ChannelDropdownComponent } from './channel-dropdown/channel-dropdown.component';
import { User } from '../../shared/models/user.model';
import { Channel } from '../../shared/models/channel.model';

export interface KeydownHandlerState {
  showMentionDropdown: boolean;
  mentionDropdownComponent?: MentionDropdownComponent;
  showChannelDropdown: boolean;
  channelDropdownComponent?: ChannelDropdownComponent;
}

export interface KeydownHandlerCallbacks {
  onUserSelected: (user: User) => void;
  onChannelSelected: (channel: Channel) => void;
  sendMessage: (event: KeyboardEvent) => void;
}

export interface InputHandlerState {
    showMentionDropdown: boolean;
    mentionSearchTerm: string;
    showChannelDropdown: boolean;
    channelSearchTerm: string;
    mentionStartPosition: number;
    channelMentionStartPosition: number;
  }

export function handleTextareaKeydown(
    event: KeyboardEvent,
    state: KeydownHandlerState,
    callbacks: KeydownHandlerCallbacks
  ): void {
    if (state.showMentionDropdown && state.mentionDropdownComponent) {
      switch (event.key) {
        case 'Escape':
          state.showMentionDropdown = false;
          event.preventDefault();
          break;
        case 'ArrowDown':
          state.mentionDropdownComponent.moveSelectionDown();
          event.preventDefault();
          break;
        case 'ArrowUp':
          state.mentionDropdownComponent.moveSelectionUp();
          event.preventDefault();
          break;
        case 'Enter':
          const selectedUser = state.mentionDropdownComponent.getSelectedUser();
          if (selectedUser) {
            callbacks.onUserSelected(selectedUser);
            state.showMentionDropdown = false;
            event.preventDefault();
          }
          break;
        default:
          break;
      }
    } else if (state.showChannelDropdown && state.channelDropdownComponent) {
      switch (event.key) {
        case 'Escape':
          state.showChannelDropdown = false;
          event.preventDefault();
          break;
        case 'ArrowDown':
          state.channelDropdownComponent.moveSelectionDown();
          event.preventDefault();
          break;
        case 'ArrowUp':
          state.channelDropdownComponent.moveSelectionUp();
          event.preventDefault();
          break;
        case 'Enter':
          const selectedChannel = state.channelDropdownComponent.getSelectedChannel();
          if (selectedChannel) {
            callbacks.onChannelSelected(selectedChannel);
            state.showChannelDropdown = false;
            event.preventDefault();
          }
          break;
        default:
          break;
      }
    } else {
      if (event.key === 'Enter') {
        callbacks.sendMessage(event);
      }
    }
  }


export function handleTextareaInput(
    event: Event,
    state: InputHandlerState
  ): void {
    const textarea = event.target as HTMLTextAreaElement;
    const cursorPosition = textarea.selectionStart || 0;
    const textBeforeCursor = textarea.value.substring(0, cursorPosition);

    state.showMentionDropdown = false;
    state.mentionSearchTerm = '';
    state.showChannelDropdown = false;
    state.channelSearchTerm = '';
  
    const atIndex = textBeforeCursor.lastIndexOf('@');
    const isAtSymbol =
      atIndex >= 0 &&
      (atIndex === 0 || /\s/.test(textBeforeCursor.charAt(atIndex - 1)));
  
    const hashIndex = textBeforeCursor.lastIndexOf('#');
    const isHashSymbol =
      hashIndex >= 0 &&
      (hashIndex === 0 || /\s/.test(textBeforeCursor.charAt(hashIndex - 1)));
  
    if (isAtSymbol && (!isHashSymbol || atIndex > hashIndex)) {

      state.mentionSearchTerm = textBeforeCursor.substring(atIndex + 1);
      state.showMentionDropdown = true;
      state.mentionStartPosition = atIndex;
    } else if (isHashSymbol) {

      state.channelSearchTerm = textBeforeCursor.substring(hashIndex + 1);
      state.showChannelDropdown = true;
      state.channelMentionStartPosition = hashIndex;
    }
  }