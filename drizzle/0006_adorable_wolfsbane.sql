CREATE TABLE `learnerReadingSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`childProfileId` int NOT NULL,
	`defaultReadingMode` enum('GUIDED_PRACTICE','ASSISTED_PRACTICE','MONTHLY_ASSESSMENT') NOT NULL DEFAULT 'ASSISTED_PRACTICE',
	`targetWcpm` int NOT NULL DEFAULT 100,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `learnerReadingSettings_id` PRIMARY KEY(`id`),
	CONSTRAINT `learnerReadingSettings_childProfileId_unique` UNIQUE(`childProfileId`)
);
--> statement-breakpoint
ALTER TABLE `readingSessions` ADD `wordTimings` json;--> statement-breakpoint
ALTER TABLE `learnerReadingSettings` ADD CONSTRAINT `learnerReadingSettings_childProfileId_childProfiles_id_fk` FOREIGN KEY (`childProfileId`) REFERENCES `childProfiles`(`id`) ON DELETE cascade ON UPDATE no action;
