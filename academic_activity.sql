CREATE DATABASE IF NOT EXISTS academic_db;
USE academic_db;
 
SET FOREIGN_KEY_CHECKS = 0;
 
-- 1. faculties (không phụ thuộc)
DROP TABLE IF EXISTS `faculties`;
CREATE TABLE `faculties` (
  `faculty_id` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  PRIMARY KEY (`faculty_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
 
-- 2. majors (tham chiếu faculties)
DROP TABLE IF EXISTS `majors`;
CREATE TABLE `majors` (
  `major_id` varchar(50) NOT NULL,
  `faculty_id` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  PRIMARY KEY (`major_id`),
  KEY `fk_majors_faculty` (`faculty_id`),
  CONSTRAINT `fk_majors_faculty` FOREIGN KEY (`faculty_id`) REFERENCES `faculties` (`faculty_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
 
-- 3. courses (tham chiếu majors)
DROP TABLE IF EXISTS `courses`;
CREATE TABLE `courses` (
  `id_course` varchar(50) NOT NULL,
  `major_id` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `credits` int NOT NULL,
  PRIMARY KEY (`id_course`),
  KEY `fk_courses_major` (`major_id`),
  CONSTRAINT `fk_courses_major` FOREIGN KEY (`major_id`) REFERENCES `majors` (`major_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
 
-- 4. semesters (không phụ thuộc)
DROP TABLE IF EXISTS `semesters`;
CREATE TABLE `semesters` (
  `semester_id` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `status` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`semester_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
 
-- 5. grade_components (không phụ thuộc)
DROP TABLE IF EXISTS `grade_components`;
CREATE TABLE `grade_components` (
  `id_grade_components` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `weight_percentage` decimal(5,2) NOT NULL,
  PRIMARY KEY (`id_grade_components`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
 
-- 6. classes (tham chiếu courses, semesters)
DROP TABLE IF EXISTS `classes`;
CREATE TABLE `classes` (
  `id_classes` varchar(50) NOT NULL,
  `course_id` varchar(50) NOT NULL,
  `semester_id` varchar(50) NOT NULL,
  `capacity` int DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `Room` varchar(50) DEFAULT NULL,
  `lecturer_id` varchar(50) DEFAULT NULL,
  `Day` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id_classes`),
  KEY `fk_classes_course` (`course_id`),
  KEY `fk_classes_semester` (`semester_id`),
  CONSTRAINT `fk_classes_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id_course`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_classes_semester` FOREIGN KEY (`semester_id`) REFERENCES `semesters` (`semester_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
 
-- 7. classes_grade_components (tham chiếu classes, grade_components)
DROP TABLE IF EXISTS `classes_grade_components`;
CREATE TABLE `classes_grade_components` (
  `id_classes` varchar(50) NOT NULL,
  `id_grade_components` varchar(50) NOT NULL,
  PRIMARY KEY (`id_classes`,`id_grade_components`),
  KEY `fk_cgc_gradecomp` (`id_grade_components`),
  CONSTRAINT `fk_cgc_class` FOREIGN KEY (`id_classes`) REFERENCES `classes` (`id_classes`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_cgc_gradecomp` FOREIGN KEY (`id_grade_components`) REFERENCES `grade_components` (`id_grade_components`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
 
-- 8. student_enrollments (tham chiếu classes)
DROP TABLE IF EXISTS `student_enrollments`;
CREATE TABLE `student_enrollments` (
  `enrollment_id` varchar(50) NOT NULL,
  `student_id` varchar(50) NOT NULL,
  `enrollment_status` varchar(50) DEFAULT NULL,
  `final_score` decimal(5,2) DEFAULT NULL,
  `id_classes` varchar(50) NOT NULL,
  `letter_grade` varchar(10) DEFAULT NULL,
  `is_passed` tinyint(1) DEFAULT NULL,
  PRIMARY KEY (`enrollment_id`),
  KEY `fk_enrollment_class` (`id_classes`),
  CONSTRAINT `fk_enrollment_class` FOREIGN KEY (`id_classes`) REFERENCES `classes` (`id_classes`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
 
-- 9. student_scores (tham chiếu student_enrollments, grade_components)
DROP TABLE IF EXISTS `student_scores`;
CREATE TABLE `student_scores` (
  `id_score` varchar(50) NOT NULL,
  `id_grade_components` varchar(50) NOT NULL,
  `enrollment_id` varchar(50) NOT NULL,
  `score` decimal(5,2) DEFAULT NULL,
  PRIMARY KEY (`id_score`),
  KEY `fk_scores_gradecomp` (`id_grade_components`),
  KEY `fk_scores_enrollment` (`enrollment_id`),
  CONSTRAINT `fk_scores_enrollment` FOREIGN KEY (`enrollment_id`) REFERENCES `student_enrollments` (`enrollment_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_scores_gradecomp` FOREIGN KEY (`id_grade_components`) REFERENCES `grade_components` (`id_grade_components`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
 
-- 10. exam_schedules (tham chiếu classes, semesters)
DROP TABLE IF EXISTS `exam_schedules`;
CREATE TABLE `exam_schedules` (
  `exam_id` varchar(50) NOT NULL,
  `semester_id` varchar(50) NOT NULL,
  `id_classes` varchar(50) NOT NULL,
  `Room` varchar(50) DEFAULT NULL,
  `start_time` datetime DEFAULT NULL,
  `end_time` datetime DEFAULT NULL,
  `capacity` int DEFAULT NULL,
  `type` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`exam_id`),
  KEY `fk_exam_semester` (`semester_id`),
  KEY `fk_exam_class` (`id_classes`),
  CONSTRAINT `fk_exam_class` FOREIGN KEY (`id_classes`) REFERENCES `classes` (`id_classes`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_exam_semester` FOREIGN KEY (`semester_id`) REFERENCES `semesters` (`semester_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
 
-- 11. exam_student (tham chiếu exam_schedules)
DROP TABLE IF EXISTS `exam_student`;
CREATE TABLE `exam_student` (
  `id_exam_student` int NOT NULL AUTO_INCREMENT,
  `exam_id` varchar(50) NOT NULL,
  `student_id` varchar(50) NOT NULL,
  `status` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id_exam_student`),
  KEY `fk_examstudent_exam` (`exam_id`),
  CONSTRAINT `fk_examstudent_exam` FOREIGN KEY (`exam_id`) REFERENCES `exam_schedules` (`exam_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
 
SET FOREIGN_KEY_CHECKS = 1;
 
 
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