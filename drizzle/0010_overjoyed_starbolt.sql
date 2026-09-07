CREATE TABLE `educatorApprovedIrishVariants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`teacherUserId` int NOT NULL,
	`classId` int NOT NULL,
	`expectedWord` varchar(80) NOT NULL,
	`recognisedVariant` varchar(80) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `educatorApprovedIrishVariants_id` PRIMARY KEY(`id`),
	CONSTRAINT `approved_irish_variant_unique` UNIQUE(`classId`,`expectedWord`,`recognisedVariant`)
);
--> statement-breakpoint
CREATE TABLE `provisionalMatchReviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`childProfileId` int NOT NULL,
	`expectedWord` varchar(80) NOT NULL,
	`recognisedWord` varchar(80) NOT NULL,
	`source` enum('built_in','educator_approved') NOT NULL DEFAULT 'built_in',
	`status` enum('pending','confirmed','dismissed') NOT NULL DEFAULT 'pending',
	`confirmedByTeacherId` int,
	`confirmedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `provisionalMatchReviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `readerClasses` ADD `defaultLanguageSupport` enum('STANDARD_ENGLISH','IRISH_ENGLISH_SUPPORT') DEFAULT 'STANDARD_ENGLISH' NOT NULL;--> statement-breakpoint
ALTER TABLE `educatorApprovedIrishVariants` ADD CONSTRAINT `educatorApprovedIrishVariants_teacherUserId_users_id_fk` FOREIGN KEY (`teacherUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `educatorApprovedIrishVariants` ADD CONSTRAINT `educatorApprovedIrishVariants_classId_readerClasses_id_fk` FOREIGN KEY (`classId`) REFERENCES `readerClasses`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `provisionalMatchReviews` ADD CONSTRAINT `provisionalMatchReviews_sessionId_readingSessions_id_fk` FOREIGN KEY (`sessionId`) REFERENCES `readingSessions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `provisionalMatchReviews` ADD CONSTRAINT `provisionalMatchReviews_childProfileId_childProfiles_id_fk` FOREIGN KEY (`childProfileId`) REFERENCES `childProfiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `provisionalMatchReviews` ADD CONSTRAINT `provisionalMatchReviews_confirmedByTeacherId_users_id_fk` FOREIGN KEY (`confirmedByTeacherId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;