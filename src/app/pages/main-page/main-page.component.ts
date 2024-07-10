import { Component } from '@angular/core';
import { ChatChannelsComponent } from "../../chat-channels/chat-channels.component";
import { ChatMainComponent } from "../../chat-main/chat-main.component";
import { ChatSecondaryComponent } from "../../chat-secondary/chat-secondary.component";
import { CommonModule } from '@angular/common';
import {MatButtonModule} from '@angular/material/button';
import {MatDividerModule} from '@angular/material/divider';
import {MatIconModule} from '@angular/material/icon';

@Component({
  selector: 'app-main-page',
  standalone: true,
  imports: [ChatChannelsComponent, ChatMainComponent, ChatSecondaryComponent, CommonModule, MatButtonModule, MatDividerModule, MatIconModule],
  templateUrl: './main-page.component.html',
  styleUrl: './main-page.component.scss'
})
export class MainPageComponent {

  showChannels: boolean = true;
  showSecondary: boolean = true;

  workspaceMenu: string = "Workspace-Menü schließen";

  openCloseChatChannel() {
    if(this.showChannels) this.workspaceMenu = "Workspace-Menü öffnen";
    else this.workspaceMenu = "Workspace-Menü schließen";
    this.showChannels = !this.showChannels;
  }

}
