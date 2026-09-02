CREATE TABLE `schoolBranding` (
	`id` int AUTO_INCREMENT NOT NULL,
	`teacherUserId` int NOT NULL,
	`schoolName` varchar(120) NOT NULL DEFAULT 'Reader Leader School',
	`accentColor` varchar(12) NOT NULL DEFAULT '#2563EB',
	`footerLine` varchar(180) NOT NULL DEFAULT 'Every reader can grow with practice and encouragement.',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `schoolBranding_id` PRIMARY KEY(`id`),
	CONSTRAINT `schoolBranding_teacherUserId_unique` UNIQUE(`teacherUserId`)
);
--> statement-breakpoint
CREATE TABLE `sessionComments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`teacherUserId` int NOT NULL,
	`comment` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sessionComments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `schoolBranding` ADD CONSTRAINT `schoolBranding_teacherUserId_users_id_fk` FOREIGN KEY (`teacherUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sessionComments` ADD CONSTRAINT `sessionComments_sessionId_readingSessions_id_fk` FOREIGN KEY (`sessionId`) REFERENCES `readingSessions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sessionComments` ADD CONSTRAINT `sessionComments_teacherUserId_users_id_fk` FOREIGN KEY (`teacherUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;