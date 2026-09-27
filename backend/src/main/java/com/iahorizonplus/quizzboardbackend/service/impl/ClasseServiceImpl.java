package com.iahorizonplus.quizzboardbackend.service.impl;

import com.iahorizonplus.quizzboardbackend.entity.*;
import com.iahorizonplus.quizzboardbackend.exception.BadRequestException;
import com.iahorizonplus.quizzboardbackend.exception.ResourceNotFoundException;
import com.iahorizonplus.quizzboardbackend.exception.UnauthorizedException;
import com.iahorizonplus.quizzboardbackend.repository.*;
import com.iahorizonplus.quizzboardbackend.service.ClasseService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class ClasseServiceImpl implements ClasseService {

    private final ClasseRepository classeRepository;
    private final StudentRepository studentRepository;
    private final UserRepository userRepository;
    private final PromotionRepository promotionRepository;
    private final QuizRepository quizRepository;

    @Override
    @Transactional(readOnly = true)
    public List<Classe> getClasses(String userEmail, String promotionId) {
        User user = userEmail != null ? userRepository.findByEmail(userEmail).orElse(null) : null;
        if (user == null) {
            return List.of();
        }
        if (user.getRole() == UserRole.LEARNER) {
            // Un apprenant voit les classes dans lesquelles il est inscrit (code, invitation ou ajout par le formateur)
            return classeRepository.findEnrolledByStudentEmail(user.getEmail());
        }
        if (promotionId != null && !promotionId.isBlank() && !"ALL".equalsIgnoreCase(promotionId)) {
            return classeRepository.findByCreatorIdAndPromotionIdOrderByCreatedAtDesc(user.getId(), promotionId);
        }
        return classeRepository.findByCreatorIdOrderByCreatedAtDesc(user.getId());
    }

    @Override
    @Transactional(readOnly = true)
    public Classe getClasseById(String id) {
        return classeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Classe introuvable avec l'ID : " + id));
    }

    @Override
    @Transactional
    public Classe createClasse(String creatorEmail, Classe classe) {
        User creator = requireUser(creatorEmail);
        // id temporaire éventuel envoyé par le frontend : l'id est toujours généré par la base
        classe.setId(null);
        if (classe.getName() == null || classe.getName().trim().isEmpty()) {
            throw new BadRequestException("name", "Le nom de la classe est obligatoire.");
        }
        if (classe.getCode() == null || classe.getCode().trim().isEmpty()) {
            throw new BadRequestException("code", "Le code d'identification de la classe est obligatoire (ex: DEV-L3).");
        }
        String code = classe.getCode().trim().toUpperCase();
        if (classeRepository.existsByCodeIgnoreCase(code)) {
            throw new BadRequestException("code", "Le code « " + code + " » est déjà utilisé par une autre classe. Choisissez-en un autre.");
        }
        classe.setName(classe.getName().trim());
        classe.setCode(code);
        classe.setCreatorId(creator.getId());
        classe.setCreatorName(creator.getName());
        if (classe.getColor() == null || classe.getColor().isBlank()) classe.setColor("#0F172A");
        resolvePromotion(classe, classe.getPromotionId(), creator);
        // Élèves et assignations se gèrent par leurs propres endpoints
        classe.setStudents(new ArrayList<>());
        classe.setAssignedQuizIds(new ArrayList<>());
        classe.setAssignedCourseIds(new ArrayList<>());
        return classeRepository.save(classe);
    }

    @Override
    @Transactional
    public Classe updateClasse(String id, Classe updated, String actorEmail) {
        Classe existing = getClasseById(id);
        User actor = assertCanManage(existing, actorEmail);
        if (updated.getName() != null && !updated.getName().isBlank()) existing.setName(updated.getName().trim());
        if (updated.getCode() != null && !updated.getCode().isBlank()) {
            String code = updated.getCode().trim().toUpperCase();
            if (classeRepository.existsByCodeIgnoreCaseAndIdNot(code, id)) {
                throw new BadRequestException("code", "Le code « " + code + " » est déjà utilisé par une autre classe.");
            }
            existing.setCode(code);
        }
        if (updated.getLevel() != null) existing.setLevel(updated.getLevel());
        if (updated.getDescription() != null) existing.setDescription(updated.getDescription());
        if (updated.getColor() != null && !updated.getColor().isBlank()) existing.setColor(updated.getColor());
        if (updated.getCoverImage() != null) existing.setCoverImage(updated.getCoverImage());
        if (!Objects.equals(updated.getPromotionId(), existing.getPromotionId())) {
            resolvePromotion(existing, updated.getPromotionId(), actor);
        }
        return classeRepository.save(existing);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Student> getStudentsInClasse(String classId) {
        return studentRepository.findByClasseId(classId);
    }

    @Override
    @Transactional
    public Student addStudentToClasse(String classId, Student student, String actorEmail) {
        Classe classe = getClasseById(classId);
        assertCanManage(classe, actorEmail);
        if (student.getPrenom() == null || student.getPrenom().isBlank()) {
            throw new BadRequestException("prenom", "Le prénom de l'élève est obligatoire.");
        }
        if (student.getNom() == null || student.getNom().isBlank()) {
            throw new BadRequestException("nom", "Le nom de l'élève est obligatoire.");
        }
        if (student.getEmail() == null || student.getEmail().isBlank()) {
            throw new BadRequestException("email", "L'adresse email de l'élève est obligatoire.");
        }
        String email = student.getEmail().trim().toLowerCase();
        if (studentRepository.existsByClasseIdAndEmailIgnoreCase(classId, email)) {
            throw new BadRequestException("email", "Cet élève (" + email + ") est déjà inscrit dans cette classe.");
        }
        student.setId(null);
        student.setEmail(email);
        student.setPrenom(student.getPrenom().trim());
        student.setNom(student.getNom().trim());
        student.setStatus("ACTIVE");
        student.setJoinedAt(null);
        student.setClasse(classe);
        return studentRepository.save(student);
    }

    @Override
    @Transactional
    public void removeStudentFromClasse(String classId, String studentId, String actorEmail) {
        Classe classe = getClasseById(classId);
        assertCanManage(classe, actorEmail);
        Student student = studentRepository.findById(studentId)
                .filter(s -> s.getClasse() != null && classId.equals(s.getClasse().getId()))
                .orElseThrow(() -> new ResourceNotFoundException("Élève introuvable dans cette classe."));
        classe.getStudents().remove(student);
        studentRepository.delete(student);
    }

    @Override
    @Transactional
    public Classe assignQuizToClass(String classId, String quizId, String actorEmail) {
        Classe classe = getClasseById(classId);
        assertCanManage(classe, actorEmail);
        Quiz quiz = quizRepository.findById(quizId)
                .orElseThrow(() -> new ResourceNotFoundException("Quiz introuvable : " + quizId));
        if (!classe.getAssignedQuizIds().contains(quizId)) {
            classe.getAssignedQuizIds().add(quizId);
        }
        if (!quiz.getAssignedClassIds().contains(classId)) {
            quiz.getAssignedClassIds().add(classId);
        }
        return classeRepository.save(classe);
    }

    @Override
    @Transactional
    public Classe unassignQuizFromClass(String classId, String quizId, String actorEmail) {
        Classe classe = getClasseById(classId);
        assertCanManage(classe, actorEmail);
        classe.getAssignedQuizIds().remove(quizId);
        quizRepository.findById(quizId).ifPresent(quiz -> quiz.getAssignedClassIds().remove(classId));
        return classeRepository.save(classe);
    }

    @Override
    @Transactional
    public void deleteClasse(String classId, String actorEmail) {
        Classe classe = getClasseById(classId);
        assertCanManage(classe, actorEmail);
        for (Quiz quiz : quizRepository.findByAssignedClassId(classId)) {
            quiz.getAssignedClassIds().remove(classId);
        }
        classeRepository.delete(classe);
    }

    @Override
    @Transactional
    public Classe joinClasseByCode(String code, String userEmail) {
        User user = requireUser(userEmail);
        if (code == null || code.isBlank()) {
            throw new BadRequestException("code", "Le code de la classe est obligatoire.");
        }
        Classe classe = classeRepository.findFirstByCodeIgnoreCase(code.trim())
                .orElseThrow(() -> new BadRequestException("code", "Code de classe introuvable. Vérifiez le code communiqué par votre enseignant."));
        if (!user.getId().equals(classe.getCreatorId())
                && !studentRepository.existsByClasseIdAndEmailIgnoreCase(classe.getId(), user.getEmail())) {
            Student student = Student.builder()
                    .prenom(user.getPrenom() != null && !user.getPrenom().isBlank() ? user.getPrenom() : "Apprenant")
                    .nom(user.getNom() != null ? user.getNom() : "")
                    .email(user.getEmail().toLowerCase())
                    .avatarUrl(user.getAvatarUrl())
                    .status("ACTIVE")
                    .classe(classe)
                    .build();
            classe.getStudents().add(studentRepository.save(student));
        }
        return classe;
    }

    @Override
    @Transactional(readOnly = true)
    public List<Quiz> getQuizzesOfClasse(String classId, String userEmail) {
        Classe classe = getClasseById(classId);
        User user = requireUser(userEmail);
        boolean allowed = user.getRole() == UserRole.ADMIN
                || user.getId().equals(classe.getCreatorId())
                || studentRepository.existsByClasseIdAndEmailIgnoreCase(classId, user.getEmail());
        if (!allowed) {
            throw new SecurityException("Vous n'êtes pas inscrit dans cette classe.");
        }
        return quizRepository.findAllById(classe.getAssignedQuizIds());
    }

    /**
     * Rattache la classe à une promotion du formateur. Un identifiant inconnu (ex. id temporaire
     * du frontend) ne bloque pas la création : la classe est alors créée sans promotion.
     */
    private void resolvePromotion(Classe classe, String promotionId, User owner) {
        if (promotionId == null || promotionId.isBlank()) {
            classe.setPromotionId(null);
            classe.setPromotionLabel(null);
            return;
        }
        Optional<Promotion> promotion = promotionRepository.findById(promotionId)
                .filter(p -> owner.getRole() == UserRole.ADMIN || owner.getId().equals(p.getCreatorId()));
        if (promotion.isEmpty()) {
            log.warn("Promotion {} introuvable pour {} : classe enregistrée sans promotion", promotionId, owner.getEmail());
            classe.setPromotionId(null);
            classe.setPromotionLabel(null);
            return;
        }
        if (promotion.get().getStatus() == PromotionStatus.ARCHIVED) {
            throw new BadRequestException("promotionId", "La promotion « " + promotion.get().getName() + " » est archivée (lecture seule) : choisissez une promotion en cours ou à venir.");
        }
        classe.setPromotionId(promotion.get().getId());
        classe.setPromotionLabel(promotion.get().getName());
    }

    private User requireUser(String email) {
        if (email == null) {
            throw new UnauthorizedException("Authentification requise.");
        }
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new UnauthorizedException("Utilisateur introuvable : reconnectez-vous."));
    }

    /** Le formateur propriétaire de la classe ou un administrateur. */
    private User assertCanManage(Classe classe, String actorEmail) {
        User actor = requireUser(actorEmail);
        if (actor.getRole() != UserRole.ADMIN && !actor.getId().equals(classe.getCreatorId())) {
            throw new SecurityException("Vous n'êtes pas autorisé à modifier cette classe.");
        }
        return actor;
    }
}
