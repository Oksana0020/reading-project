CREATE TABLE `childProfiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`displayName` varchar(80) NOT NULL,
	`bookBand` varchar(80) NOT NULL DEFAULT 'Level 3 · Sky Blue',
	`familyCode` varchar(12) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `childProfiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `childProfiles_userId_unique` UNIQUE(`userId`),
	CONSTRAINT `childProfiles_familyCode_unique` UNIQUE(`familyCode`)
);
--> statement-breakpoint
CREATE TABLE `classEnrollments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`classId` int NOT NULL,
	`childProfileId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `classEnrollments_id` PRIMARY KEY(`id`),
	CONSTRAINT `class_child_unique` UNIQUE(`classId`,`childProfileId`)
);
--> statement-breakpoint
CREATE TABLE `familyLinks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`parentUserId` int NOT NULL,
	`childProfileId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `familyLinks_id` PRIMARY KEY(`id`),
	CONSTRAINT `parent_child_unique` UNIQUE(`parentUserId`,`childProfileId`)
);
--> statement-breakpoint
CREATE TABLE `readerClasses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`teacherUserId` int NOT NULL,
	`name` varchar(120) NOT NULL,
	`joinCode` varchar(12) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `readerClasses_id` PRIMARY KEY(`id`),
	CONSTRAINT `readerClasses_joinCode_unique` UNIQUE(`joinCode`)
);
--> statement-breakpoint
CREATE TABLE `readingExercises` (
	`id` int AUTO_INCREMENT NOT NULL,
	`materialId` int NOT NULL,
	`exerciseSet` json NOT NULL,
	`modelName` varchar(80) NOT NULL,
	`approvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `readingExercises_id` PRIMARY KEY(`id`),
	CONSTRAINT `readingExercises_materialId_unique` UNIQUE(`materialId`)
);
--> statement-breakpoint
CREATE TABLE `readingMaterials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`teacherUserId` int NOT NULL,
	`title` varchar(180) NOT NULL,
	`readingLevel` varchar(80) NOT NULL,
	`sourceText` text NOT NULL,
	`sourceFilename` varchar(255),
	`storageKey` varchar(512),
	`status` enum('draft','assigned') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `readingMaterials_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `readingSessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`childProfileId` int NOT NULL,
	`materialId` int,
	`storyTitle` varchar(180) NOT NULL,
	`transcript` text NOT NULL,
	`accuracy` int NOT NULL,
	`wordsCorrectPerMinute` int NOT NULL,
	`durationSeconds` int NOT NULL,
	`completed` int NOT NULL DEFAULT 1,
	`practiceWords` json NOT NULL,
	`interventions` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `readingSessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','child','teacher','parent') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `childProfiles` ADD CONSTRAINT `childProfiles_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `classEnrollments` ADD CONSTRAINT `classEnrollments_classId_readerClasses_id_fk` FOREIGN KEY (`classId`) REFERENCES `readerClasses`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `classEnrollments` ADD CONSTRAINT `classEnrollments_childProfileId_childProfiles_id_fk` FOREIGN KEY (`childProfileId`) REFERENCES `childProfiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `familyLinks` ADD CONSTRAINT `familyLinks_parentUserId_users_id_fk` FOREIGN KEY (`parentUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `familyLinks` ADD CONSTRAINT `familyLinks_childProfileId_childProfiles_id_fk` FOREIGN KEY (`childProfileId`) REFERENCES `childProfiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `readerClasses` ADD CONSTRAINT `readerClasses_teacherUserId_users_id_fk` FOREIGN KEY (`teacherUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `readingExercises` ADD CONSTRAINT `readingExercises_materialId_readingMaterials_id_fk` FOREIGN KEY (`materialId`) REFERENCES `readingMaterials`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `readingMaterials` ADD CONSTRAINT `readingMaterials_teacherUserId_users_id_fk` FOREIGN KEY (`teacherUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `readingSessions` ADD CONSTRAINT `readingSessions_childProfileId_childProfiles_id_fk` FOREIGN KEY (`childProfileId`) REFERENCES `childProfiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `readingSessions` ADD CONSTRAINT `readingSessions_materialId_readingMaterials_id_fk` FOREIGN KEY (`materialId`) REFERENCES `readingMaterials`(`id`) ON DELETE set null ON UPDATE no action;