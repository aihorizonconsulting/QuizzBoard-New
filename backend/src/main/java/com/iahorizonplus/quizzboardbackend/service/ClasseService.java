package com.iahorizonplus.quizzboardbackend.service;

import com.iahorizonplus.quizzboardbackend.entity.Classe;
import com.iahorizonplus.quizzboardbackend.entity.Quiz;
import com.iahorizonplus.quizzboardbackend.entity.Student;

import java.util.List;

public interface ClasseService {
    /** Classes du formateur connecté, ou classes dans lesquelles l'apprenant connecté est inscrit. */
    List<Classe> getClasses(String userEmail, String promotionId);
    Classe getClasseById(String id);
    Classe createClasse(String creatorEmail, Classe classe);
    Classe updateClasse(String id, Classe classe, String actorEmail);
    Student addStudentToClasse(String classId, Student student, String actorEmail);
    void removeStudentFromClasse(String classId, String studentId, String actorEmail);
    List<Student> getStudentsInClasse(String classId);
    Classe assignQuizToClass(String classId, String quizId, String actorEmail);
    Classe unassignQuizFromClass(String classId, String quizId, String actorEmail);
    void deleteClasse(String classId, String actorEmail);
    /** Inscription de l'utilisateur connecté dans la classe portant ce code. */
    Classe joinClasseByCode(String code, String userEmail);
    /** Quiz assignés à la classe (y compris privés) pour son formateur et ses élèves inscrits. */
    List<Quiz> getQuizzesOfClasse(String classId, String userEmail);
}
