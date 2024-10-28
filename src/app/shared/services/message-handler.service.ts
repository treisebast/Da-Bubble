import { Injectable } from '@angular/core';
import { ScrollService } from './scroll-service.service';
import { Message } from '../models/message.model';

@Injectable({
    providedIn: 'root',
})
export class MessageHandlerService {
    constructor(
        private scrollService: ScrollService,
    ) { }


    /**
 * Handles loading and scrolling to a selected message in the chat.
 * @param component - The component instance where the chat is displayed.
 * @param message - The message object to be loaded and displayed.
 */
    async handleSelectedMessage(component: any, message: Message) {
        const chatId = message.chatId;
        const isPrivate = message.isPrivateChat;

        if (chatId) {
            if (
                component.currentChat?.id !== chatId ||
                component.isCurrentChatPrivate !== isPrivate
            ) {
                await component.loadChatById(chatId, isPrivate);
            }
            if (message.id) {
                this.scrollService.scrollToMessage(message.id);
            }
        }
    }
}
