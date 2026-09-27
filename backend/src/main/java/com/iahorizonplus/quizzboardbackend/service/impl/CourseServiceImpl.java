package com.iahorizonplus.quizzboardbackend.service.impl;

import com.iahorizonplus.quizzboardbackend.entity.Course;
import com.iahorizonplus.quizzboardbackend.entity.CourseChapter;
import com.iahorizonplus.quizzboardbackend.entity.SubscriptionTier;
import com.iahorizonplus.quizzboardbackend.entity.User;
import com.iahorizonplus.quizzboardbackend.entity.UserRole;
import com.iahorizonplus.quizzboardbackend.exception.ResourceNotFoundException;
import com.iahorizonplus.quizzboardbackend.repository.CourseChapterRepository;
import com.iahorizonplus.quizzboardbackend.repository.CourseRepository;
import com.iahorizonplus.quizzboardbackend.repository.UserRepository;
import com.iahorizonplus.quizzboardbackend.service.CourseService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

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
        User creator = null;
        if (creatorId != null) {
            creator = userRepository.findById(creatorId)
                    .or(() -> userRepository.findByEmail(creatorId))
                    .orElse(null);
        }

        if (creator != null) {
            course.setCreatorId(creator.getId());
            course.setCreatorName(creatorName != null ? creatorName : creator.getName());
        } else {
            course.setCreatorId(creatorId != null ? creatorId : "system");
            course.setCreatorName(creatorName != null ? creatorName : "Formateur");
        }

        course.setId(null);

        if (course.getChapters() != null) {
            for (CourseChapter chap : course.getChapters()) {
                chap.setId(null);
                chap.setCourse(course);
            }
        }

        return courseRepository.save(course);
    }

    @Override
    @Transactional
    public Course updateCourse(String id, Course updated, String creatorId) {
        Course existing = getCourseById(id);
        assertCanManage(existing, creatorId, "modifier ce cours");

        // Mise à jour partielle : un champ absent du payload ne vide jamais la valeur existante
        if (updated.getTitle() != null && !updated.getTitle().isBlank()) existing.setTitle(updated.getTitle().trim());
        if (updated.getDescription() != null) existing.setDescription(updated.getDescription());
        if (updated.getCategory() != null && !updated.getCategory().isBlank()) existing.setCategory(updated.getCategory());
        if (updated.getLevel() != null) existing.setLevel(updated.getLevel());
        if (updated.getEstimatedHours() > 0) existing.setEstimatedHours(updated.getEstimatedHours());
        if (updated.getStatus() != null && !updated.getStatus().isBlank()) existing.setStatus(updated.getStatus());
        if (updated.getCoverImage() != null) existing.setCoverImage(updated.getCoverImage());
        if (updated.getAssignedClassIds() != null) existing.setAssignedClassIds(new ArrayList<>(updated.getAssignedClassIds()));
        if (updated.getAssignedClassNames() != null) existing.setAssignedClassNames(new ArrayList<>(updated.getAssignedClassNames()));
        existing.setHasCertificate(updated.isHasCertificate());
        existing.setHasChapterQuizzes(updated.isHasChapterQuizzes());
        existing.setHasFinalQuiz(updated.isHasFinalQuiz());
        if (updated.getFinalQuizTitle() != null) existing.setFinalQuizTitle(updated.getFinalQuizTitle());
        if (updated.getFinalQuizQuestionsCount() != null) existing.setFinalQuizQuestionsCount(updated.getFinalQuizQuestionsCount());
        if (updated.getCertificateTemplateType() != null) existing.setCertificateTemplateType(updated.getCertificateTemplateType());
        if (updated.getCertificateCustomTemplateUrl() != null) existing.setCertificateCustomTemplateUrl(updated.getCertificateCustomTemplateUrl());
        if (updated.getCertificateMinimumScore() != null) existing.setCertificateMinimumScore(updated.getCertificateMinimumScore());

        if (updated.getChapters() != null && !updated.getChapters().isEmpty()) {
            mergeChapters(existing, updated.getChapters());
        }

        return courseRepository.save(existing);
    }

    /**
     * Ajout, modification et suppression de chapitres : les chapitres existants gardent leur id,
     * ceux portant un identifiant temporaire du frontend sont créés.
     */
    private void mergeChapters(Course course, List<CourseChapter> incoming) {
        Map<String, CourseChapter> current = new HashMap<>();
        for (CourseChapter ch : course.getChapters()) {
            if (ch.getId() != null) current.put(ch.getId(), ch);
        }
        List<CourseChapter> result = new ArrayList<>();
        int index = 0;
        for (CourseChapter in : incoming) {
            if (in == null) continue;
            index++;
            CourseChapter target = in.getId() != null ? current.remove(in.getId()) : null;
            if (target == null) {
                target = new CourseChapter();
                target.setCourse(course);
            }
            target.setOrder(index);
            target.setTitle(in.getTitle() != null && !in.getTitle().isBlank() ? in.getTitle().trim() : "Chapitre " + index);
            target.setSummary(in.getSummary());
            target.setContent(in.getContent());
            target.setEstimatedMinutes(in.getEstimatedMinutes() > 0 ? in.getEstimatedMinutes() : 30);
            target.setHasQuiz(in.isHasQuiz());
            target.setQuizTitle(in.getQuizTitle());
            target.setQuizQuestionsCount(in.getQuizQuestionsCount());
            result.add(target);
        }
        course.getChapters().clear();
        course.getChapters().addAll(result);
    }

    @Override
    @Transactional
    public void deleteCourse(String id, String creatorId) {
        Course existing = getCourseById(id);
        assertCanManage(existing, creatorId, "supprimer ce cours");
        courseRepository.delete(existing);
    }

    /** L'auteur du cours ou un administrateur (modération) peuvent le gérer. */
    private void assertCanManage(Course course, String actorId, String action) {
        if (actorId != null && actorId.equals(course.getCreatorId())) {
            return;
        }
        boolean admin = actorId != null && userRepository.findById(actorId)
                .map(u -> u.getRole() == UserRole.ADMIN)
                .orElse(false);
        if (!admin) {
            throw new SecurityException("Vous n'êtes pas autorisé à " + action);
        }
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
