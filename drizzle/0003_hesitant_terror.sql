CREATE TABLE `quizAttempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`childProfileId` int NOT NULL,
	`materialId` int NOT NULL,
	`answers` json NOT NULL,
	`score` int NOT NULL,
	`totalQuestions` int NOT NULL,
	`completedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `quizAttempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `readingSessions` ADD `audioStorageKey` varchar(512);--> statement-breakpoint
ALTER TABLE `quizAttempts` ADD CONSTRAINT `quizAttempts_childProfileId_childProfiles_id_fk` FOREIGN KEY (`childProfileId`) REFERENCES `childProfiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quizAttempts` ADD CONSTRAINT `quizAttempts_materialId_readingMaterials_id_fk` FOREIGN KEY (`materialId`) REFERENCES `readingMaterials`(`id`) ON DELETE cascade ON UPDATE no action;