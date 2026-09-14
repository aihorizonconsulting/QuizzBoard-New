package com.iahorizonplus.quizzboardbackend.service.impl;

import com.iahorizonplus.quizzboardbackend.entity.Classe;
import com.iahorizonplus.quizzboardbackend.entity.Student;
import com.iahorizonplus.quizzboardbackend.entity.User;
import com.iahorizonplus.quizzboardbackend.exception.BadRequestException;
import com.iahorizonplus.quizzboardbackend.exception.ResourceNotFoundException;
import com.iahorizonplus.quizzboardbackend.repository.ClasseRepository;
import com.iahorizonplus.quizzboardbackend.repository.StudentRepository;
import com.iahorizonplus.quizzboardbackend.repository.UserRepository;
import com.iahorizonplus.quizzboardbackend.service.ClasseService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ClasseServiceImpl implements ClasseService {

    private final ClasseRepository classeRepository;
    private final StudentRepository studentRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public List<Classe> getClasses(String creatorEmail, String promotionId) {
        if (promotionId != null && !promotionId.isBlank() && !"ALL".equalsIgnoreCase(promotionId)) {
            return classeRepository.findByPromotionId(promotionId);
        }
        User creator = userRepository.findByEmail(creatorEmail).orElse(null);
        if (creator != null) {
            return classeRepository.findByCreatorIdOrderByCreatedAtDesc(creator.getId());
        }
        return classeRepository.findAll();
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
        if (classe.getName() == null || classe.getName().trim().isEmpty()) {
            throw new BadRequestException("name", "Le nom de la classe est obligatoire.");
        }
        if (classe.getCode() == null || classe.getCode().trim().isEmpty()) {
            throw new BadRequestException("code", "Le code d'identification de la classe est obligatoire (ex: DEV-L3).");
        }

        User creator = userRepository.findByEmail(creatorEmail).orElse(null);
        if (creator != null) {
            classe.setCreatorId(creator.getId());
            classe.setCreatorName(creator.getPrenom() + " " + creator.getNom());
        }
        return classeRepository.save(classe);
    }

    @Override
    @Transactional
    public Classe updateClasse(String id, Classe updated) {
        Classe existing = getClasseById(id);
        existing.setName(updated.getName());
        existing.setCode(updated.getCode());
        existing.setLevel(updated.getLevel());
        existing.setDescription(updated.getDescription());
        existing.setColor(updated.getColor());
        existing.setPromotionId(updated.getPromotionId());
        existing.setPromotionLabel(updated.getPromotionLabel());
        return classeRepository.save(existing);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Student> getStudentsInClasse(String classId) {
        return studentRepository.findByClasseId(classId);
    }

    @Override
    @Transactional
    public Student addStudentToClasse(String classId, Student student) {
        Classe classe = getClasseById(classId);
        student.setClasse(classe);
        return studentRepository.save(student);
    }

    @Override
    @Transactional
    public void removeStudentFromClasse(String classId, String studentId) {
        studentRepository.deleteById(studentId);
    }

    @Override
    @Transactional
    public void assignQuizToClass(String classId, String quizId) {
        Classe classe = getClasseById(classId);
        if (!classe.getAssignedQuizIds().contains(quizId)) {
            classe.getAssignedQuizIds().add(quizId);
            classeRepository.save(classe);
        }
    }

    @Override
    @Transactional
    public void unassignQuizFromClass(String classId, String quizId) {
        Classe classe = getClasseById(classId);
        classe.getAssignedQuizIds().remove(quizId);
        classeRepository.save(classe);
    }

    @Override
    @Transactional
    public void deleteClasse(String classId) {
        classeRepository.deleteById(classId);
    }
}
