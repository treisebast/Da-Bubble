import { Component } from '@angular/core';
import { ChatChannelsComponent } from "../../chat-channels/chat-channels.component";
import { ChatMainComponent } from "../../chat-main/chat-main.component";
import { ChatSecondaryComponent } from "../../chat-secondary/chat-secondary.component";

@Component({
  selector: 'app-main-page',
  standalone: true,
  imports: [ChatChannelsComponent, ChatMainComponent, ChatSecondaryComponent],
  templateUrl: './main-page.component.html',
  styleUrl: './main-page.component.scss'
})
export class MainPageComponent {

}
