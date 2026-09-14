package com.iahorizonplus.quizzboardbackend.service;

import com.iahorizonplus.quizzboardbackend.entity.Classe;
import com.iahorizonplus.quizzboardbackend.entity.Student;

import java.util.List;

public interface ClasseService {
    List<Classe> getClasses(String creatorEmail, String promotionId);
    Classe getClasseById(String id);
    Classe createClasse(String creatorEmail, Classe classe);
    Classe updateClasse(String id, Classe classe);
    Student addStudentToClasse(String classId, Student student);
    void removeStudentFromClasse(String classId, String studentId);
    List<Student> getStudentsInClasse(String classId);
    void assignQuizToClass(String classId, String quizId);
    void unassignQuizFromClass(String classId, String quizId);
    void deleteClasse(String classId);
}
