CREATE TABLE `homePracticeChecklists` (
	`id` int AUTO_INCREMENT NOT NULL,
	`parentUserId` int NOT NULL,
	`childProfileId` int NOT NULL,
	`checklistDate` varchar(10) NOT NULL,
	`completedSteps` json NOT NULL,
	`completedAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `homePracticeChecklists_id` PRIMARY KEY(`id`),
	CONSTRAINT `parent_child_practice_date_unique` UNIQUE(`parentUserId`,`childProfileId`,`checklistDate`)
);
--> statement-breakpoint
CREATE TABLE `parentReminders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`parentUserId` int NOT NULL,
	`childProfileId` int NOT NULL,
	`checklistId` int NOT NULL,
	`title` varchar(160) NOT NULL,
	`message` varchar(360) NOT NULL,
	`status` enum('unread','read') NOT NULL DEFAULT 'unread',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`readAt` timestamp,
	CONSTRAINT `parentReminders_id` PRIMARY KEY(`id`),
	CONSTRAINT `parentReminders_checklistId_unique` UNIQUE(`checklistId`)
);
--> statement-breakpoint
ALTER TABLE `homePracticeChecklists` ADD CONSTRAINT `homePracticeChecklists_parentUserId_users_id_fk` FOREIGN KEY (`parentUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `homePracticeChecklists` ADD CONSTRAINT `homePracticeChecklists_childProfileId_childProfiles_id_fk` FOREIGN KEY (`childProfileId`) REFERENCES `childProfiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `parentReminders` ADD CONSTRAINT `parentReminders_parentUserId_users_id_fk` FOREIGN KEY (`parentUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `parentReminders` ADD CONSTRAINT `parentReminders_childProfileId_childProfiles_id_fk` FOREIGN KEY (`childProfileId`) REFERENCES `childProfiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `parentReminders` ADD CONSTRAINT `parentReminders_checklistId_homePracticeChecklists_id_fk` FOREIGN KEY (`checklistId`) REFERENCES `homePracticeChecklists`(`id`) ON DELETE cascade ON UPDATE no action;
