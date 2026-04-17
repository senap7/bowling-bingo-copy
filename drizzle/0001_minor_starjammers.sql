CREATE TABLE `teamBingoStates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`teamNumber` int NOT NULL,
	`gridData` text NOT NULL,
	`markedCells` text NOT NULL,
	`completedLines` text NOT NULL,
	`totalScore` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `teamBingoStates_id` PRIMARY KEY(`id`)
);
