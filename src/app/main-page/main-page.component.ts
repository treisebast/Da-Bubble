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
  imports: [
    SideNavComponent,
    ChatMainComponent,
    ThreadComponent,
    CommonModule,
    MatButtonModule,
    MatDividerModule,
    MatIconModule,
    HeaderComponent,
  ],
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

  onChannelSelected() {
    if (this.isMobileView) {
      this.currentView = 'main';
    }
  }

  openCloseChatChannel() {
    if (this.isMobileView) {
      this.currentView = 'channels';
    } else {
      this.showChannels = !this.showChannels;
      this.workspaceMenu = this.showChannels ? 'Workspace-Menü schließen' : 'Workspace-Menü öffnen';
    }
  }

  closeThreadComponent() {
    console.log('Closing thread component');
    this.showSecondary = false;
    if (this.isMobileView) {
      this.currentView = 'main';
    }
  }

  openThreadComponent() {
    console.log('Opening thread component');
    this.showSecondary = true;
    if (this.isMobileView) {
      this.currentView = 'secondary';
    }
  }

  switchTo(view: 'channels' | 'main' | 'secondary') {
    console.log('Switching to view:', view);
    this.currentView = view;

    if (!this.isMobileView) {
      this.showChannels = view === 'channels' || view === 'main';
      this.showSecondary = view === 'secondary';
    }
  }
}
