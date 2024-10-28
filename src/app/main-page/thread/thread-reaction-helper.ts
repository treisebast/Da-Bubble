import { Injectable } from '@angular/core';
import { Message } from '../../shared/models/message.model';
import { UserService } from '../../shared/services/user.service';

@Injectable({
    providedIn: 'root'
})
export class ThreadReactionHelper {
    constructor(private userService: UserService) { }

    /**
     * Adds or removes a reaction to a message.
     * @param message - The message to which the reaction is added or removed.
     * @param emoji - The emoji representing the reaction.
     * @param currentUserId - The ID of the current user.
     */
    toggleReaction(message: Message, emoji: string, currentUserId: string): void {
        if (!message.reactions) {
            message.reactions = {};
        }

        if (this.hasUserReacted(message, emoji, currentUserId)) {
            this.removeUserReaction(message, emoji, currentUserId);
        } else {
            this.addUserReaction(message, emoji, currentUserId);
        }

        this.userService.addEmoji(emoji); // Track emoji usage for user
    }

    /**
     * Checks if the user has reacted to a message with the given emoji.
     * @param message - The message to check.
     * @param emoji - The emoji representing the reaction.
     * @param userId - The ID of the user.
     * @returns True if the user has reacted with the emoji, otherwise false.
     */
    hasUserReacted(message: Message, emoji: string, userId: string): boolean {
        return !!message.reactions?.[emoji]?.includes(userId);
    }

    /**
     * Adds a reaction from a user to a message.
     * @param message - The message to which the reaction is added.
     * @param emoji - The emoji representing the reaction.
     * @param userId - The ID of the user.
     */
    addUserReaction(message: Message, emoji: string, userId: string): void {
        if (!message.reactions) {
            message.reactions = {};
        }
        if (!message.reactions[emoji]) {
            message.reactions[emoji] = [];
        }
        message.reactions[emoji].push(userId);
    }

    /**
     * Removes a reaction from a user to a message.
     * @param message - The message from which the reaction is removed.
     * @param emoji - The emoji representing the reaction.
     * @param userId - The ID of the user.
     */
    removeUserReaction(message: Message, emoji: string, userId: string): void {
        if (!message.reactions || !message.reactions[emoji]) return;
        message.reactions[emoji] = message.reactions[emoji].filter((id) => id !== userId);
        if (message.reactions[emoji].length === 0) {
            delete message.reactions[emoji];
        }
    }

    /**
     * Counts the reactions of a particular emoji on a message.
     * @param message - The message to count reactions on.
     * @param emoji - The emoji to count.
     * @returns The count of reactions.
     */
    getReactionCount(message: Message, emoji: string): number {
        return message.reactions?.[emoji]?.length || 0;
    }
}
