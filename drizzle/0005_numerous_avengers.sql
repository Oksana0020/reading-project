ALTER TABLE `readingSessions` ADD `assessmentMode` enum('GUIDED_PRACTICE','ASSISTED_PRACTICE','MONTHLY_ASSESSMENT') DEFAULT 'ASSISTED_PRACTICE' NOT NULL;--> statement-breakpoint
ALTER TABLE `readingSessions` ADD `wordStates` json NULL;--> statement-breakpoint
UPDATE `readingSessions` SET `wordStates` = JSON_ARRAY() WHERE `wordStates` IS NULL;--> statement-breakpoint
ALTER TABLE `readingSessions` MODIFY `wordStates` json NOT NULL;
