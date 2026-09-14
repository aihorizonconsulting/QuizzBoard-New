package com.iahorizonplus.quizzboardbackend.service;

import com.iahorizonplus.quizzboardbackend.entity.Course;
import com.iahorizonplus.quizzboardbackend.entity.CourseChapter;

import java.util.List;

public interface CourseService {
    List<Course> getAllPublishedCourses();
    List<Course> getCoursesByCreator(String creatorId);
    Course getCourseById(String id);
    Course createCourse(Course course, String creatorId, String creatorName);
    Course updateCourse(String id, Course course, String creatorId);
    void deleteCourse(String id, String creatorId);
    CourseChapter addChapter(String courseId, CourseChapter chapter, String creatorId);
}
