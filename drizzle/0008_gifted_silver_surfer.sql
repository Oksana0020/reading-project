CREATE TABLE `teacherTermPresets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`teacherUserId` int NOT NULL,
	`name` varchar(80) NOT NULL,
	`startDate` varchar(10) NOT NULL,
	`endDate` varchar(10) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `teacherTermPresets_id` PRIMARY KEY(`id`),
	CONSTRAINT `teacher_term_preset_name_unique` UNIQUE(`teacherUserId`,`name`)
);
--> statement-breakpoint
ALTER TABLE `teacherTermPresets` ADD CONSTRAINT `teacherTermPresets_teacherUserId_users_id_fk` FOREIGN KEY (`teacherUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;