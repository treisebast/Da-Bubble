import { Component, HostListener, inject, OnInit } from '@angular/core';
import { SideNavComponent } from './side-nav/side-nav.component';
import { ChatMainComponent } from './chat-main/chat-main.component';
import { ThreadComponent } from './thread/thread.component';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { HeaderComponent } from '../shared/header/header.component';
import { ChatService } from '../shared/services/chat-service.service';
import { slideInOut, slideInOutRight } from './main-page.animations';

@Component({
  selector: 'app-main-page',
  standalone: true,
  imports: [SideNavComponent, ChatMainComponent, ThreadComponent, CommonModule, MatButtonModule, MatDividerModule, MatIconModule, HeaderComponent],
  templateUrl: './main-page.component.html',
  styleUrls: ['./main-page.component.scss'],
  animations: [slideInOut, slideInOutRight],
})
export class MainPageComponent implements OnInit {
  showChannels: boolean = true;
  showSecondary: boolean = false;
  currentView: 'channels' | 'main' | 'secondary' = 'channels';
  isMobileView: boolean = false;
  private chatService = inject(ChatService);
  private previousChatId: string | null = null;
  workspaceMenu: string = 'Workspace-Menü schließen';


  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.checkViewModes();
  }


  /**
 * Lifecycle hook that is called after data-bound properties are initialized.
 * Initializes the view modes and subscribes to current chat updates.
 */
  ngOnInit() {
    this.checkViewModes();

    if (this.isMobileView) {
      this.currentView = 'channels';
    } else {
      this.currentView = 'main';
    }

    this.chatService.currentChat$.subscribe(({ chat }) => {
      if (this.previousChatId && chat?.id !== this.previousChatId) {
        this.closeThreadComponent();
      }
      this.previousChatId = chat?.id || null;
    });
  }


  /**
 * Checks and updates the view modes based on the current window width.
 * Adjusts visibility of channels and updates the current view accordingly.
 */
  checkViewModes() {
    const width = window.innerWidth;
    this.isMobileView = width <= 1079;

    if (width < 1079) {
      if (this.showChannels) {
        this.showChannels = false;
        this.workspaceMenu = 'Workspace-Menü öffnen';
      }
      this.currentView = 'channels';
    } else {
      if (!this.showChannels) {
        this.showChannels = true;
        this.workspaceMenu = 'Workspace-Menü schließen';
      }
      this.currentView = 'main';
    }
  }


  /**
 * Handles the event when a channel is selected.
 * Switches the view to 'main' if in mobile view.
 */
  onChannelSelected() {
    if (this.isMobileView) {
      this.currentView = 'main';
    }
  }


  /**
 * Toggles the visibility of the chat channel menu.
 * Adjusts the workspace menu text based on the new state.
 */
  openCloseChatChannel() {
    if (this.isMobileView) {
      this.currentView = 'channels';
    } else {
      this.showChannels = !this.showChannels;
      this.workspaceMenu = this.showChannels ? 'Workspace-Menü schließen' : 'Workspace-Menü öffnen';
    }
  }


  /**
 * Closes the thread component and updates the view based on the current view mode.
 */
  closeThreadComponent() {
    // console.log('Closing thread component');
    this.showSecondary = false;
    if (this.isMobileView) {
      this.currentView = 'main';
    }
  }


  /**
 * Opens the thread component and updates the view based on the current view mode.
 */
  openThreadComponent() {
    // console.log('Opening thread component');
    this.showSecondary = true;
    if (this.isMobileView) {
      this.currentView = 'secondary';
    }
  }


  /**
 * Switches the current view to the specified mode.
 * Updates visibility of channels and secondary components based on the view.
 * @param view - The view to switch to ('channels', 'main', or 'secondary')
 */
  switchTo(view: 'channels' | 'main' | 'secondary') {
    // console.log('Switching to view:', view);
    this.currentView = view;

    if (!this.isMobileView) {
      this.showChannels = view === 'channels' || view === 'main';
      this.showSecondary = view === 'secondary';
    }
  }


  /**
 * Opens the welcome channel by resetting the current chat context.
 */
  openWelcomeChannel() {
    this.chatService.setCurrentChat(null, false);
  }


  /**
 * Handles the event when the server name is clicked.
 * Switches to the 'main' view and opens the welcome channel.
 */
  handleServerNameClick() {
    this.switchTo('main');
    this.openWelcomeChannel();
  }
}
