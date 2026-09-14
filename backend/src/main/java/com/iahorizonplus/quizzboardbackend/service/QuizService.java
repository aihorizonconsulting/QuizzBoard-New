package com.iahorizonplus.quizzboardbackend.service;

import com.iahorizonplus.quizzboardbackend.entity.Quiz;

import java.util.List;

public interface QuizService {
    List<Quiz> getAllPublicQuizzes();
    List<Quiz> getQuizzesByCreator(String creatorId);
    Quiz getQuizById(String id);
    Quiz getQuizByShareCodeOrPin(String codeOrPin);
    Quiz createQuiz(Quiz quiz, String creatorId, String creatorName);
    Quiz updateQuiz(String id, Quiz quiz, String creatorId);
    void deleteQuiz(String id, String creatorId);
    Quiz toggleVisibility(String id, String creatorId);
    Quiz assignClasses(String quizId, List<String> classIds);
}
