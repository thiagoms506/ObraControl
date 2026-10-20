-- ObraControl schema migration 002
-- Creates only the persistent session table. Review and execute manually.
USE `obracontrol`;

CREATE TABLE `sessions` (
  `session_id` VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `expires` INT UNSIGNED NOT NULL,
  `data` MEDIUMTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  PRIMARY KEY (`session_id`),
  KEY `ix_sessions_expires` (`expires`)
) ENGINE=InnoDB DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_bin;
