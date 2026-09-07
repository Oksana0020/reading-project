CREATE TABLE `weeklyReadingGoals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`teacherUserId` int NOT NULL,
	`childProfileId` int NOT NULL,
	`weekStart` varchar(10) NOT NULL,
	`targetMinutes` int NOT NULL DEFAULT 20,
	`targetSessions` int NOT NULL DEFAULT 3,
	`note` varchar(240),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `weeklyReadingGoals_id` PRIMARY KEY(`id`),
	CONSTRAINT `teacher_child_week_goal_unique` UNIQUE(`teacherUserId`,`childProfileId`,`weekStart`)
);
--> statement-breakpoint
ALTER TABLE `weeklyReadingGoals` ADD CONSTRAINT `weeklyReadingGoals_teacherUserId_users_id_fk` FOREIGN KEY (`teacherUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `weeklyReadingGoals` ADD CONSTRAINT `weeklyReadingGoals_childProfileId_childProfiles_id_fk` FOREIGN KEY (`childProfileId`) REFERENCES `childProfiles`(`id`) ON DELETE cascade ON UPDATE no action;