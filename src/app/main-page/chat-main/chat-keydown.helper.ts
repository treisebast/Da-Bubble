import { MentionDropdownComponent } from './mention-dropdown/mention-dropdown.component';
import { ChannelDropdownComponent } from './channel-dropdown/channel-dropdown.component';
import { User } from '../../shared/models/user.model';
import { Channel } from '../../shared/models/channel.model';


/**
 * State interface for handling keydown events related to mention and channel dropdowns.
 * @interface KeydownHandlerState
 * @property {boolean} showMentionDropdown - Indicates if the mention dropdown is visible.
 * @property {MentionDropdownComponent} [mentionDropdownComponent] - Reference to the mention dropdown component.
 * @property {boolean} showChannelDropdown - Indicates if the channel dropdown is visible.
 * @property {ChannelDropdownComponent} [channelDropdownComponent] - Reference to the channel dropdown component.
 */
export interface KeydownHandlerState {
  showMentionDropdown: boolean;
  mentionDropdownComponent?: MentionDropdownComponent;
  showChannelDropdown: boolean;
  channelDropdownComponent?: ChannelDropdownComponent;
}


/**
 * Callback functions for keydown handlers in mention and channel dropdowns.
 * @interface KeydownHandlerCallbacks
 * @property {(user: User) => void} onUserSelected - Callback triggered when a user is selected from the dropdown.
 * @property {(channel: Channel) => void} onChannelSelected - Callback triggered when a channel is selected from the dropdown.
 * @property {(event: KeyboardEvent) => void} sendMessage - Callback triggered to send a message.
 */
export interface KeydownHandlerCallbacks {
  onUserSelected: (user: User) => void;
  onChannelSelected: (channel: Channel) => void;
  sendMessage: (event: KeyboardEvent) => void;
}

/**
 * State interface for handling input events and dropdown visibility for mentions and channels.
 * @interface InputHandlerState
 * @property {boolean} showMentionDropdown - Indicates if the mention dropdown is visible.
 * @property {string} mentionSearchTerm - Search term for filtering users in the mention dropdown.
 * @property {boolean} showChannelDropdown - Indicates if the channel dropdown is visible.
 * @property {string} channelSearchTerm - Search term for filtering channels in the channel dropdown.
 * @property {number} mentionStartPosition - Start position in the text for mentions (e.g., `@` symbol).
 * @property {number} channelMentionStartPosition - Start position in the text for channels (e.g., `#` symbol).
 */
export interface InputHandlerState {
  showMentionDropdown: boolean;
  mentionSearchTerm: string;
  showChannelDropdown: boolean;
  channelSearchTerm: string;
  mentionStartPosition: number;
  channelMentionStartPosition: number;
}


/**
* Manages keydown events in the textarea for mention and channel dropdowns.
* @param {KeyboardEvent} event - The keydown event in the textarea.
* @param {KeydownHandlerState} state - The current state of dropdowns and components.
* @param {KeydownHandlerCallbacks} callbacks - Callbacks for user and channel selection, and sending a message.
* @returns {void}
*/
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


/**
* Handles input events in the textarea to detect mention or channel symbols (@ or #).
* @param {Event} event - The input event from the textarea.
* @param {InputHandlerState} state - The current input state, including search terms and dropdown visibility.
* @returns {void}
*/
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