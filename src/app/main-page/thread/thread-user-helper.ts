import { Injectable } from '@angular/core';
import { UserService } from '../../shared/services/user.service';
import { User } from '../../shared/models/user.model';
import { Message } from '../../shared/models/message.model';
import { ChangeDetectorRef } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class ThreadUserHelper {
    constructor(private userService: UserService) { }

    /**
      * Resolves usernames for a list of messages by senderId.
      * @param messages - Array of messages to resolve usernames for.
      * @param userNames - Object to store resolved usernames.
      */
    async resolveUserNames(messages: Message[], userNames: { [key: string]: string }) {
        const userIds = [...new Set(messages.map((msg) => msg.senderId))];
        for (const userId of userIds) {
            if (!userNames[userId]) {
                const userName = await this.userService.getUserNameById(userId);
                userNames[userId] = userName as string;
            }
        }
    }

    /**
      * Loads user profiles for a given list of messages.
      * @param messages - Array of messages to load profiles for.
      * @param userProfiles - Object to store loaded user profiles.
      * @param cdr - The ChangeDetectorRef instance from the component.
      */
    loadUserProfiles(
        messages: Message[],
        userProfiles: { [key: string]: User },
        cdr: ChangeDetectorRef,
        unsubscribe$: Subject<void>
    ) {
        const allUserIds = this.collectUserIds(messages);
        const newUserIds = allUserIds.filter((userId) => !userProfiles[userId]);
        if (newUserIds.length === 0) return;
        this.userService.getUsersByIds(newUserIds).pipe(
            takeUntil(unsubscribe$)
        ).subscribe((users) => {
            this.assignUserProfiles(users, newUserIds, userProfiles);
            this.setStandardAvatars(newUserIds, userProfiles);
            cdr.detectChanges();
        });
    }


    /**
      * Collects a unique set of user IDs from the sender and reactions of a list of messages.
      * @private
      * @param {Message[]} messages - Array of messages to extract user IDs from.
      * @returns {string[]} Array of unique user IDs found in the messages.
      */
    private collectUserIds(messages: Message[]): string[] {
        const userIds = new Set<string>();
        messages.forEach(({ senderId, reactions }) => {
            userIds.add(senderId);
            if (reactions) {
                Object.values(reactions).flat().forEach(userIds.add, userIds);
            }
        });
        return Array.from(userIds);
    }


    /**
      * Assigns user profiles to the user profiles map for given user IDs.
      * @private
      * @param {User[]} users - Array of user objects to add to user profiles.
      * @param {string[]} newUserIds - Array of user IDs to assign profiles for.
      * @param {{ [key: string]: User }} userProfiles - Map to store user profiles, using user ID as the key.
      */
    private assignUserProfiles(users: User[], newUserIds: string[], userProfiles: { [key: string]: User }): void {
        users.forEach((user) => {
            if (user) {
                userProfiles[user.userId] = user;
            }
        });
    }


    /**
      * Sets a default avatar for users without an assigned profile.
      * @private
      * @param {string[]} userIds - Array of user IDs to check for missing profiles.
      * @param {{ [key: string]: User }} userProfiles - Map to store user profiles, assigning a default avatar if needed.
      */
    private setStandardAvatars(userIds: string[], userProfiles: { [key: string]: User }) {
        userIds.forEach((userId, index) => {
            if (!userProfiles[userId]) {
                userProfiles[userId] = {
                    userId,
                    name: 'Unknown',
                    email: '',
                    avatar: `assets/img/profile/${index % 10}.svg`,
                    status: 'offline',
                    lastSeen: null,
                };
            }
        });
    }
}
