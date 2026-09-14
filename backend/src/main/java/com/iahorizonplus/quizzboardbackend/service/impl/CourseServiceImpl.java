package com.iahorizonplus.quizzboardbackend.service.impl;

import com.iahorizonplus.quizzboardbackend.entity.Course;
import com.iahorizonplus.quizzboardbackend.entity.CourseChapter;
import com.iahorizonplus.quizzboardbackend.entity.SubscriptionTier;
import com.iahorizonplus.quizzboardbackend.entity.User;
import com.iahorizonplus.quizzboardbackend.exception.ResourceNotFoundException;
import com.iahorizonplus.quizzboardbackend.repository.CourseChapterRepository;
import com.iahorizonplus.quizzboardbackend.repository.CourseRepository;
import com.iahorizonplus.quizzboardbackend.repository.UserRepository;
import com.iahorizonplus.quizzboardbackend.service.CourseService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class CourseServiceImpl implements CourseService {

    private final CourseRepository courseRepository;
    private final CourseChapterRepository chapterRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public List<Course> getAllPublishedCourses() {
        return courseRepository.findByStatus("PUBLISHED");
    }

    @Override
    @Transactional(readOnly = true)
    public List<Course> getCoursesByCreator(String creatorId) {
        return courseRepository.findByCreatorIdOrderByCreatedAtDesc(creatorId);
    }

    @Override
    @Transactional(readOnly = true)
    public Course getCourseById(String id) {
        return courseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Cours non trouvé avec l'id: " + id));
    }

    @Override
    @Transactional
    public Course createCourse(Course course, String creatorId, String creatorName) {
        User creator = userRepository.findById(creatorId)
                .orElseThrow(() -> new ResourceNotFoundException("Créateur non trouvé"));

        course.setCreatorId(creatorId);
        course.setCreatorName(creatorName != null ? creatorName : creator.getName());

        if (course.getChapters() != null) {
            for (CourseChapter chap : course.getChapters()) {
                chap.setCourse(course);
            }
        }

        return courseRepository.save(course);
    }

    @Override
    @Transactional
    public Course updateCourse(String id, Course updated, String creatorId) {
        Course existing = getCourseById(id);
        if (!existing.getCreatorId().equals(creatorId)) {
            throw new SecurityException("Vous n'êtes pas autorisé à modifier ce cours");
        }

        existing.setTitle(updated.getTitle());
        existing.setDescription(updated.getDescription());
        existing.setCategory(updated.getCategory());
        existing.setLevel(updated.getLevel());
        existing.setEstimatedHours(updated.getEstimatedHours());
        existing.setStatus(updated.getStatus());
        existing.setCoverImage(updated.getCoverImage());
        existing.setAssignedClassIds(updated.getAssignedClassIds());
        existing.setAssignedClassNames(updated.getAssignedClassNames());
        existing.setHasCertificate(updated.isHasCertificate());
        existing.setCertificateMinimumScore(updated.getCertificateMinimumScore());

        return courseRepository.save(existing);
    }

    @Override
    @Transactional
    public void deleteCourse(String id, String creatorId) {
        Course existing = getCourseById(id);
        if (!existing.getCreatorId().equals(creatorId)) {
            throw new SecurityException("Vous n'êtes pas autorisé à supprimer ce cours");
        }
        courseRepository.delete(existing);
    }

    @Override
    @Transactional
    public CourseChapter addChapter(String courseId, CourseChapter chapter, String creatorId) {
        Course course = getCourseById(courseId);
        if (!course.getCreatorId().equals(creatorId)) {
            throw new SecurityException("Non autorisé à modifier ce cours");
        }
        chapter.setCourse(course);
        return chapterRepository.save(chapter);
    }
}
