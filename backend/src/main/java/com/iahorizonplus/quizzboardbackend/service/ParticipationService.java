package com.iahorizonplus.quizzboardbackend.service;

import com.iahorizonplus.quizzboardbackend.entity.ParticipantAnswer;
import com.iahorizonplus.quizzboardbackend.entity.Participation;

import java.util.List;

public interface ParticipationService {
    Participation submitParticipation(Participation participation, List<ParticipantAnswer> answers);
    List<Participation> getParticipationsByQuiz(String quizId);
    List<Participation> getParticipationsByUser(String userId);
    Participation getParticipationById(String id);
}
