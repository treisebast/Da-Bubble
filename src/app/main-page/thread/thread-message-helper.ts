import { Injectable } from '@angular/core';
import { ThreadService } from '../../shared/services/thread.service';
import { Message } from '../../shared/models/message.model';
import { ThreadFileHelper } from './thread-file-helper';
import { serverTimestamp } from 'firebase/firestore';
import { Channel } from '../../shared/models/channel.model';
import { ThreadComponent } from './thread.component';

@Injectable({
    providedIn: 'root',
})
export class ThreadMessageHelper {
    constructor(private threadService: ThreadService) { }

    /**
      * Sends a message to a specific thread.
      * @param {object} messageData - Data containing chatId, threadId, and the message to be sent.
      * @param {ThreadService} threadService - The thread service for handling thread operations.
      * @returns {Promise<void>} A promise that resolves when the message is added to the thread.
      */
    async sendMessage(messageData: any, threadService: ThreadService) {
        return threadService.addThread(messageData.chatId, messageData.threadId, messageData.message);
    }


    /**
      * Checks if the current user can delete the specified message.
      * @param {Message} message - The message to check for deletion permissions.
      * @param {string} currentUserId - The ID of the current user.
      * @returns {boolean} True if the user is authorized to delete the message; otherwise, false.
      */
    canDeleteMessage(message: Message, currentUserId: string): boolean {
        return message.senderId === currentUserId;
    }


    /**
      * Deletes a list of message attachments.
      * @param {string[]} attachments - Array of attachment URLs to be deleted.
      * @param {ThreadFileHelper} fileHelper - Helper class for handling file operations.
      * @returns {Promise<void>} A promise that resolves when all attachments are deleted.
      */
    async deleteMessageAttachments(attachments: string[], fileHelper: ThreadFileHelper) {
        const deleteTasks = attachments.map((url) => fileHelper.deleteFile(url));
        await Promise.all(deleteTasks);
    }


    /**
      * Deletes a message from the specified thread.
      * @param {Message} message - The message to delete.
      * @param {ThreadService} threadService - The thread service for handling thread operations.
      * @returns {Promise<void>} A promise that resolves when the message is deleted.
      */
    async deleteMessageFromThread(message: Message, threadService: ThreadService): Promise<void> {
        await threadService.deleteThread(
            message.chatId!,
            threadService.currentMessageId,
            message.id!
        );
    }


    /**
      * Creates and sends a new message in a thread.
      * @param {string} newMessageText - The content of the new message.
      * @param {string} currentUserId - The ID of the current user.
      * @param {boolean} isCurrentChatPrivate - Indicates if the chat is private.
      * @param {Channel | null} currentChat - The current chat channel.
      * @param {string | null} attachmentUrl - URL of the attachment, if any.
      * @param {ThreadService} threadService - The thread service for handling thread operations.
      * @returns {Promise<void>} A promise that resolves when the message is created and sent.
      */
    async createAndSendNewMessage(newMessageText: string, currentUserId: string, isCurrentChatPrivate: boolean, currentChat: Channel | null, attachmentUrl: string | null, threadService: ThreadService): Promise<void> {
        const newMessage: Message = {
            content: newMessageText,
            content_lowercase: newMessageText.toLowerCase(),
            senderId: currentUserId,
            timestamp: serverTimestamp(),
            isPrivateChat: isCurrentChatPrivate,
            chatId: currentChat?.id ?? '',
            attachments: attachmentUrl ? [attachmentUrl] : [],
        };

        if (currentChat?.id) {
            await threadService.addThread(currentChat.id, threadService.currentMessageId, newMessage);
        }
    }


    /**
      * Resets message-related fields in the ThreadComponent.
      * @param {ThreadComponent} component - The instance of the ThreadComponent to reset fields for.
      */
    resetMessageFields(component: ThreadComponent): void {
        component.newMessageText = '';
        component.attachmentUrl = null;
        component.selectedFile = null;
        component.previewUrl = null;
        if (component.fileInput) {
            component.fileInput.nativeElement.value = '';
        }
    }


    /**
      * Loads attachments for a message in the component.
      * @param {string[] | undefined} attachments - List of attachment URLs to load.
      * @param {ThreadComponent} component - The instance of the ThreadComponent to load attachments into.
      */
    loadAttachments(attachments: string[] | undefined, component: ThreadComponent): void {
        if (attachments) {
            attachments.forEach((attachment) => {
                if (!component.isImage(attachment)) {
                    component.loadFileMetadata(attachment);
                }
            });
        }
    }


    /**
      * Starts editing a message by setting the editing fields in the component.
      * @param {ThreadComponent} component - The instance of the ThreadComponent to start editing in.
      * @param {Message} message - The message to edit.
      */
    startEditing(component: ThreadComponent, message: Message) {
        if (message.senderId === component.currentUserId) {
            component.editingMessageId = message.id;
            component.editContent = message.content;
        }
    }


    /**
      * Saves the edited message content, updating the message in the thread.
      * @param {ThreadComponent} component - The instance of the ThreadComponent containing the message.
      * @param {Message} message - The message to save.
      */
    saveEdit(component: ThreadComponent, message: Message) {
        const hasAttachments = message.attachments && message.attachments.length > 0;
        if (component.editContent.trim() !== '' || hasAttachments) {
            message.content = component.editContent;
            this.threadService.updateThread(
                message.chatId!,
                this.threadService.currentMessageId,
                message
            );
        }
        component.editingMessageId = null;
    }

    /**
      * Cancels the editing process by resetting the editing fields in the component.
      * @param {ThreadComponent} component - The instance of the ThreadComponent to cancel editing in.
      */
    cancelEdit(component: ThreadComponent) {
        component.editingMessageId = null;
    }
}
