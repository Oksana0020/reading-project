CREATE TABLE `materialAssignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`classId` int NOT NULL,
	`materialId` int NOT NULL,
	`assignedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `materialAssignments_id` PRIMARY KEY(`id`),
	CONSTRAINT `assigned_material_class_unique` UNIQUE(`classId`,`materialId`)
);
--> statement-breakpoint
ALTER TABLE `materialAssignments` ADD CONSTRAINT `materialAssignments_classId_readerClasses_id_fk` FOREIGN KEY (`classId`) REFERENCES `readerClasses`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `materialAssignments` ADD CONSTRAINT `materialAssignments_materialId_readingMaterials_id_fk` FOREIGN KEY (`materialId`) REFERENCES `readingMaterials`(`id`) ON DELETE cascade ON UPDATE no action;