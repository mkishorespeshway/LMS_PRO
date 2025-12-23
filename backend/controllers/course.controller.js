import courseModel from '../models/course.model.js'
import AppError from '../utils/error.utils.js';
import cloudinary from 'cloudinary';
import fs from 'fs';
import { videoDuration } from "@numairawan/video-duration";

// get all courses
const getAllCourses = async (req, res, next) => {
    try {
        const courses = await courseModel.find({}).select('-lectures');

        res.status(200).json({
            success: true,
            message: 'All courses',
            courses
        })
    } catch (e) {
        return next(new AppError(e.message, 500));
    }
}

// get specific course
const getLecturesByCourseId = async (req, res, next) => {
    try {
        const { id } = req.params;

        const course = await courseModel.findById(id)
        if (!course) {
            return next(new AppError('course not found', 500));
        }

        res.status(200).json({
            success: true,
            message: 'course',
            course
        })
    } catch (e) {
        return next(new AppError(e.message, 500));
    }
}

// create course
const createCourse = async (req, res, next) => {
    try {
        const { title, description, category, createdBy } = req.body;

        if (!title || !description || !category || !createdBy) {
            return next(new AppError('All fields are required', 400));
        }

        const course = await courseModel.create({
            title,
            description,
            category,
            createdBy
        })

        if (!course) {
            return next(new AppError('Course could not created, please try again', 500));
        }

        // file upload
        if (req.file) {
            const result = await cloudinary.v2.uploader.upload(req.file.path, {
                folder: 'Learning-Management-System'
            })

            if (result) {
                course.thumbnail.public_id = result.public_id;
                course.thumbnail.secure_url = result.secure_url;
            }

            fs.rmSync(`uploads/${req.file.filename}`);
        }

        await course.save();

        res.status(200).json({
            success: true,
            message: 'Course successfully created',
            course
        })

    } catch (e) {
        return next(new AppError(e.message, 500));
    }
}

// update course
const updateCourse = async (req, res, next) => {
    try {
        const { id } = req.params;
        const course = await courseModel.findByIdAndUpdate(
            id,
            {
                $set: req.body
            },
            {
                runValidators: true
            }
        )

        if (!course) {
            return next(new AppError('Course with given id does not exist', 500));
        }

        if (req.file) {
            await cloudinary.v2.uploader.destroy(course.thumbnail.public_id);

            const result = await cloudinary.v2.uploader.upload(req.file.path, {
                folder: 'Learning-Management-System'
            })

            if (result) {
                course.thumbnail.public_id = result.public_id;
                course.thumbnail.secure_url = result.secure_url;

                // Remove file from server
                fs.rmSync(`uploads/${req.file.filename}`);

            }

        }

        await course.save();

        res.status(200).json({
            success: true,
            message: 'Course updated successfully',
            course
        })
    } catch (e) {
        return next(new AppError(e.message, 500));
    }
}

// remove course
const removeCourse = async (req, res, next) => {
    try {
        const { id } = req.params;

        const course = await courseModel.findById(id);

        if (!course) {
            return next(new AppError('Course with given id does not exist', 500));
        }

        await courseModel.findByIdAndDelete(id);

        res.status(200).json({
            success: true,
            message: 'course deleted successfully'
        })

    } catch (e) {
        return next(new AppError(e.message, 500));
    }
}

// add lecture to course by id
const addLectureToCourseById = async (req, res, next) => {
    try {
const { title, description, videoUrl, duration } = req.body;
        const { id } = req.params;

        if (!title || !description || (!req.file && !videoUrl)) {
            return next(new AppError('All fields are required, and either a video file or a video URL must be provided.', 400));
        }

        if (req.file && videoUrl) {
            return next(new AppError('Please provide either a video file or a video URL, not both.', 400));
        }

        const course = await courseModel.findById(id);

        if (!course) {
            return next(new AppError('course with given id does not exist', 400));
        }

        let lectureDuration = duration; // Use provided duration if available

        if (videoUrl && !lectureDuration) {
            try {
                const fetchedDuration = await videoDuration(videoUrl);
                // Format duration as needed, e.g., "1h 30m" or "90m"
                // For simplicity, let's store in seconds for now and format on frontend if needed
                lectureDuration = `${Math.round(fetchedDuration / 60)}m`; // Example: convert seconds to minutes
            } catch (error) {
                console.error("Error fetching video duration:", error);
                // Optionally, handle error or proceed without duration
            }
        }

        const lectureData = {
            title,
            description,
            lecture: {},
            duration: lectureDuration
        }

        // file upload or video URL
        if (req.file) {
            try {
                const result = await cloudinary.v2.uploader.upload(req.file.path, {
                    folder: 'Learning-Management-System',
                    resource_type: "video"
                });
                if (result) {
                    lectureData.lecture.public_id = result.public_id;
                    lectureData.lecture.secure_url = result.secure_url;
                }

                if (!lectureDuration) {
                    const fetchedDuration = await videoDuration(req.file.path);
                    lectureDuration = `${Math.round(fetchedDuration / 60)}m`;
                }

                fs.rmSync(`uploads/${req.file.filename}`);
            } catch (e) {
                 return next(new AppError(e.message, 500));
            }
        } else if (videoUrl) {
            lectureData.lecture.secure_url = videoUrl;
        }

        course.lectures.push(lectureData);
        course.numberOfLectures = course.lectures.length;

        await course.save();

        res.status(200).json({
            success: true,
            message: 'lecture added successfully'
        })

    } catch (e) {
         return next(new AppError(e.message, 500));
    }
}

// delete lecture by course id and lecture id
const deleteCourseLecture = async (req, res, next) => {
    try {
        const { courseId, lectureId } = req.query;

        const course = await courseModel.findById(courseId);

        if (!course) {
            return next(new AppError('Course not found', 404));
        }

        const lectureIndex = course.lectures.findIndex(lecture => lecture._id.toString() === lectureId);

        if (lectureIndex === -1) {
            return next(new AppError('Lecture not found in the course', 404));
        }

        course.lectures.splice(lectureIndex, 1);

        course.numberOfLectures = course.lectures.length;

        await course.save();

        res.status(200).json({
            success: true,
            message: 'Lecture deleted successfully'
        });
    } catch (e) {
        return next(new AppError(e.message, 500));
    }
};


// update lecture by course id and lecture id
const updateCourseLecture = async (req, res, next) => {
    try {
        const { courseId, lectureId } = req.query;
        const { title, description, videoUrl, duration } = req.body;

        if (!title || !description || (!req.file && !videoUrl)) {
            return next(new AppError('All fields are required, and either a video file or a video URL must be provided.', 400));
        }

        if (req.file && videoUrl) {
            return next(new AppError('Please provide either a video file or a video URL, not both.', 400));
        }

        const course = await courseModel.findById(courseId);

        if (!course) {
            return next(new AppError('Course not found', 404));
        }

        const lectureIndex = course.lectures.findIndex(lecture => lecture._id.toString() === lectureId);

        if (lectureIndex === -1) {
            return next(new AppError('Lecture not found in the course', 404));
        }

        let lectureDuration = duration; // Use provided duration if available

        if (videoUrl && !lectureDuration) {
            try {
                const fetchedDuration = await videoDuration(videoUrl);
                lectureDuration = `${Math.round(fetchedDuration / 60)}m`;
            } catch (error) {
                console.error("Error fetching video duration:", error);
            }
        }

        const updatedLectureData = {
            title,
            description,
            lecture: {
                public_id: null,
                secure_url: null
            },
            duration: lectureDuration
        };

        if (videoUrl) {
            updatedLectureData.lecture.secure_url = videoUrl;
            // If there's an existing video, delete the old one from Cloudinary
            if (course.lectures[lectureIndex].lecture.public_id) {
                await cloudinary.v2.uploader.destroy(course.lectures[lectureIndex].lecture.public_id);
            }
        } else if (req.file) {
            try {
                const result = await cloudinary.v2.uploader.upload(req.file.path, {
                    folder: 'Learning-Management-System',
                    resource_type: "video"
                });
                if (result) {
                    updatedLectureData.lecture.public_id = result.public_id;
                    updatedLectureData.lecture.secure_url = result.secure_url;
                }

                if (!lectureDuration) {
                    const fetchedDuration = await videoDuration(req.file.path);
                    lectureDuration = `${Math.round(fetchedDuration / 60)}m`;
                }

                // If there's an existing video, delete the old one from Cloudinary
                if (course.lectures[lectureIndex].lecture.public_id) {
                    await cloudinary.v2.uploader.destroy(course.lectures[lectureIndex].lecture.public_id);
                }

                fs.rmSync(`uploads/${req.file.filename}`);
            } catch (e) {
                return next(new AppError(e.message, 500));
            }
        }

        // Update the lecture details
        course.lectures[lectureIndex] = updatedLectureData;

        await course.save();

        res.status(200).json({
            success: true,
            message: 'Lecture updated successfully'
        });
    } catch (e) {
        return next(new AppError(e.message, 500));
    }
};


export {
    getAllCourses,
    getLecturesByCourseId,
    createCourse,
    updateCourse,
    removeCourse,
    addLectureToCourseById,
    deleteCourseLecture,
    updateCourseLecture
}