import { Component, HostListener, inject, OnInit } from '@angular/core';
import { SideNavComponent } from './side-nav/side-nav.component';
import { ChatMainComponent } from "./chat-main/chat-main.component";
import { ThreadComponent } from "./thread/thread.component";
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { HeaderComponent } from '../../shared/header/header.component';
import { ChatServiceService } from '../../shared/services/chat-service.service';

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
    HeaderComponent
],
  templateUrl: './main-page.component.html',
  styleUrls: ['./main-page.component.scss']
})
export class MainPageComponent implements OnInit {

  showChannels: boolean = true;
  showSecondary: boolean | null = false;
  currentView: 'channels' | 'main' | 'secondary' = 'channels';
  isMobileView: boolean = false;
  private chatService = inject(ChatServiceService);

  workspaceMenu: string = "Workspace-Menü schließen";

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.checkMobileView();
  }

  ngOnInit() {
    this.checkMobileView();

    this.chatService.getChannelStatus().subscribe((status: boolean) => {
      console.log('Channel Status:', status); // Debugging output
      this.showSecondary = status;
    });
  }

  checkMobileView() {
    this.isMobileView = window.innerWidth <= 1000;
    if (!this.isMobileView) {
      this.currentView = 'main';
    }
  }

  openCloseChatChannel() {
    if (this.showChannels) this.workspaceMenu = "Workspace-Menü öffnen";
    else this.workspaceMenu = "Workspace-Menü schließen";
    this.showChannels = !this.showChannels;
  }

  closeThreadComponent() {
    console.log('Closing thread component'); // Debugging output
    this.chatService.setChannelFalse();
    this.showSecondary = false;
  }

  openThreadComponent() {
    console.log('Opening thread component'); // Debugging output
    this.chatService.setChannelTrue();
    this.showSecondary = true;
  }

  switchTo(view: 'channels' | 'main' | 'secondary') {
    console.log('Switching to view:', view); // Debugging output
    this.currentView = view;
  }
}
