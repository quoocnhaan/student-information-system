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
