import { Component, HostListener, OnInit } from '@angular/core';
import { ChatChannelsComponent } from "../../chat-channels/chat-channels.component";
import { ChatMainComponent } from "../../chat-main/chat-main.component";
import { ChatSecondaryComponent } from "../../chat-secondary/chat-secondary.component";
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { HeaderComponent } from '../../header/header.component';

@Component({
  selector: 'app-main-page',
  standalone: true,
  imports: [
    ChatChannelsComponent, 
    ChatMainComponent, 
    ChatSecondaryComponent, 
    CommonModule, 
    MatButtonModule, 
    MatDividerModule, 
    MatIconModule,
    HeaderComponent,
  ],
  templateUrl: './main-page.component.html',
  styleUrls: ['./main-page.component.scss']
})
export class MainPageComponent implements OnInit {
  
  showChannels: boolean = true;
  showSecondary: boolean = true;
  currentView: 'channels' | 'main' | 'secondary' = 'channels';
  isMobileView: boolean = false;

  workspaceMenu: string = "Workspace-Menü schließen";

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.checkMobileView();
  }

  ngOnInit() {
    this.checkMobileView();
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

  switchTo(view: 'channels' | 'main' | 'secondary') {
    this.currentView = view;
  }
}
