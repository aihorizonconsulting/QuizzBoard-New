package com.iahorizonplus.quizzboardbackend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "participant_answers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ParticipantAnswer {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String questionId;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "answer_selected_choices", joinColumns = @JoinColumn(name = "answer_id"))
    @Column(name = "choice_id")
    @Builder.Default
    private List<String> selectedChoiceIds = new ArrayList<>();

    @Column(nullable = false)
    private boolean isCorrect;

    private int timeSpentSeconds;
    private int pointsEarned;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "participation_id")
    @JsonIgnore
    private Participation participation;
}
