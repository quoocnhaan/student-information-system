-- =====================================================
-- DATABASE: activity_db
-- =====================================================
CREATE DATABASE IF NOT EXISTS activity_db;
USE activity_db;

SET FOREIGN_KEY_CHECKS = 0;

-- 1. classes (không phụ thuộc)
DROP TABLE IF EXISTS `classes`;
CREATE TABLE `classes` (
  `id_classes` varchar(50) NOT NULL,
  PRIMARY KEY (`id_classes`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

LOCK TABLES `classes` WRITE;
INSERT INTO `classes` VALUES ('TEST_CLASS_01');
UNLOCK TABLES;

-- 2. section (tham chiếu classes)
DROP TABLE IF EXISTS `section`;
CREATE TABLE `section` (
  `id_section` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `id_classes` varchar(50) NOT NULL,
  PRIMARY KEY (`id_section`),
  KEY `fk_section_classes` (`id_classes`),
  CONSTRAINT `fk_section_classes` FOREIGN KEY (`id_classes`) REFERENCES `classes` (`id_classes`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

LOCK TABLES `section` WRITE;
INSERT INTO `section` VALUES ('5eccbbac-a6be-468c-ad78-60e6865db5f3','Chuong 1','TEST_CLASS_01');
UNLOCK TABLES;

-- 3. activity (tham chiếu section)
DROP TABLE IF EXISTS `activity`;
CREATE TABLE `activity` (
  `id_activity` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `id_section` varchar(50) NOT NULL,
  `type` varchar(50) NOT NULL,
  `time_open` date DEFAULT NULL,
  `time_close` date DEFAULT NULL,
  PRIMARY KEY (`id_activity`),
  KEY `fk_activity_section` (`id_section`),
  CONSTRAINT `fk_activity_section` FOREIGN KEY (`id_section`) REFERENCES `section` (`id_section`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 4. assignment (tham chiếu activity)
DROP TABLE IF EXISTS `assignment`;
CREATE TABLE `assignment` (
  `id_assignment` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `file_teacher` varchar(255) DEFAULT NULL,
  `id_activity` varchar(50) NOT NULL,
  `description` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`id_assignment`),
  UNIQUE KEY `uq_assignment_activity` (`id_activity`),
  CONSTRAINT `fk_assignment_activity` FOREIGN KEY (`id_activity`) REFERENCES `activity` (`id_activity`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 5. assignment_student_approve (tham chiếu assignment)
DROP TABLE IF EXISTS `assignment_student_approve`;
CREATE TABLE `assignment_student_approve` (
  `id_assignment_student_approve` varchar(50) NOT NULL,
  `id_assignment` varchar(50) NOT NULL,
  `id_student` varchar(50) NOT NULL,
  `submit_file` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id_assignment_student_approve`),
  KEY `fk_asa_assignment` (`id_assignment`),
  CONSTRAINT `fk_asa_assignment` FOREIGN KEY (`id_assignment`) REFERENCES `assignment` (`id_assignment`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 6. file (tham chiếu activity)
DROP TABLE IF EXISTS `file`;
CREATE TABLE `file` (
  `id_file` varchar(50) NOT NULL,
  `id_activity` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `file_url` varchar(500) NOT NULL,
  PRIMARY KEY (`id_file`),
  KEY `fk_file_activity` (`id_activity`),
  CONSTRAINT `fk_file_activity` FOREIGN KEY (`id_activity`) REFERENCES `activity` (`id_activity`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 7. quiz (tham chiếu activity)
DROP TABLE IF EXISTS `quiz`;
CREATE TABLE `quiz` (
  `id_quiz` varchar(50) NOT NULL,
  `id_activity` varchar(50) NOT NULL,
  `description` varchar(500) DEFAULT NULL,
  `duration` int DEFAULT NULL,
  `attemptsLimit` int DEFAULT NULL,
  `attempts_limit` int DEFAULT NULL,
  PRIMARY KEY (`id_quiz`),
  UNIQUE KEY `uq_quiz_activity` (`id_activity`),
  CONSTRAINT `fk_quiz_activity` FOREIGN KEY (`id_activity`) REFERENCES `activity` (`id_activity`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 8. attempts (tham chiếu quiz)
DROP TABLE IF EXISTS `attempts`;
CREATE TABLE `attempts` (
  `id_attempt` varchar(50) NOT NULL,
  `id_quiz` varchar(50) NOT NULL,
  `id_student` varchar(50) NOT NULL,
  `attempt_Number` int DEFAULT NULL,
  `start_time` datetime DEFAULT NULL,
  `finished_time` datetime DEFAULT NULL,
  `grade` float DEFAULT NULL,
  PRIMARY KEY (`id_attempt`),
  KEY `fk_attempts_quiz` (`id_quiz`),
  CONSTRAINT `fk_attempts_quiz` FOREIGN KEY (`id_quiz`) REFERENCES `quiz` (`id_quiz`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 9. question (tham chiếu quiz)
DROP TABLE IF EXISTS `question`;
CREATE TABLE `question` (
  `id_question` varchar(50) NOT NULL,
  `id_quiz` varchar(50) NOT NULL,
  `title` varchar(500) NOT NULL,
  PRIMARY KEY (`id_question`),
  KEY `fk_question_quiz` (`id_quiz`),
  CONSTRAINT `fk_question_quiz` FOREIGN KEY (`id_quiz`) REFERENCES `quiz` (`id_quiz`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 10. options (tham chiếu question)
DROP TABLE IF EXISTS `options`;
CREATE TABLE `options` (
  `id_option` varchar(50) NOT NULL,
  `id_question` varchar(50) NOT NULL,
  `answer` varchar(500) NOT NULL,
  `correct` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id_option`),
  KEY `fk_option_question` (`id_question`),
  CONSTRAINT `fk_option_question` FOREIGN KEY (`id_question`) REFERENCES `question` (`id_question`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 11. student_answer (tham chiếu attempts, question, options)
DROP TABLE IF EXISTS `student_answer`;
CREATE TABLE `student_answer` (
  `id_sa` varchar(50) NOT NULL,
  `id_attempt` varchar(50) NOT NULL,
  `id_question` varchar(50) NOT NULL,
  `id_option` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id_sa`),
  UNIQUE KEY `uk_student_answer_attempt_question` (`id_attempt`, `id_question`),
  KEY `fk_sa_attempt` (`id_attempt`),
  KEY `fk_sa_question` (`id_question`),
  KEY `fk_sa_option` (`id_option`),
  CONSTRAINT `fk_sa_attempt` FOREIGN KEY (`id_attempt`) REFERENCES `attempts` (`id_attempt`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_sa_option` FOREIGN KEY (`id_option`) REFERENCES `options` (`id_option`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_sa_question` FOREIGN KEY (`id_question`) REFERENCES `question` (`id_question`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

SET FOREIGN_KEY_CHECKS = 1;
