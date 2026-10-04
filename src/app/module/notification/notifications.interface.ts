import { ObjectId } from "mongoose";

/** What kind of screen a notification's relatedId points at, so the app
 * knows where to navigate when the user taps it. */
export type NotificationEntityType =
  | "normalLeague"
  | "americanoLeague"
  | "dualAmericanoEvent"
  | "team"
  | "chat";

export interface INotification {
    userId: ObjectId;
    title: string;
    message: string;
    type: string;
    read: boolean;
    /** What entity relatedId refers to — absent for notifications with
     * nothing to navigate to. */
    entityType?: NotificationEntityType;
    /** Id of the league/event/team/chat this notification is about. */
    relatedId?: string;
}
