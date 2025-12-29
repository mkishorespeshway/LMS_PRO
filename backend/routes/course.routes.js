import { Router } from "express";
const router = Router();
import { getAllCourses, getLecturesByCourseId, createCourse, updateCourse, removeCourse, addLectureToCourseById, deleteCourseLecture, updateCourseLecture, getVideoDuration, addQuizToCourse, getEnrolledStudents } from '../controllers/course.controller.js'
import { isLoggedIn, authorisedRoles, authorizeSubscriber } from "../middleware/auth.middleware.js";
import upload from "../middleware/multer.middleware.js"; 

router.route('/')
    .get(getAllCourses)
    .post(isLoggedIn, authorisedRoles('ADMIN'), upload.single("thumbnail"), createCourse)
    .delete(isLoggedIn, authorisedRoles('ADMIN'), deleteCourseLecture)
    .put(isLoggedIn, authorisedRoles('ADMIN'), upload.single("lecture"), updateCourseLecture)

router.route('/get-video-duration')
    .post(isLoggedIn, authorisedRoles('ADMIN'), getVideoDuration);

router.route('/:id/quiz')
    .post(isLoggedIn, authorisedRoles("ADMIN"), addQuizToCourse);

router.route('/:id/students')
    .get(isLoggedIn, authorisedRoles("ADMIN"), getEnrolledStudents);

router.route('/:id')
    .get(isLoggedIn, authorizeSubscriber, getLecturesByCourseId)
    .put(isLoggedIn, authorisedRoles("ADMIN"), upload.single("thumbnail"), updateCourse)
    .delete(isLoggedIn, authorisedRoles('ADMIN'), removeCourse)
    .post(isLoggedIn, authorisedRoles("ADMIN"), upload.single("lecture"), addLectureToCourseById);

export default router