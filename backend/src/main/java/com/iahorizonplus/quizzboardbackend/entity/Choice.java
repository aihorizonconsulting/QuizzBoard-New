package com.iahorizonplus.quizzboardbackend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "quiz_choices")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Choice {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false, length = 500)
    private String text;

    @Column(nullable = false)
    @JsonProperty("isCorrect")
    private boolean isCorrect;

    @Column(name = "order_index")
    private int order;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id")
    @JsonIgnore
    private Question question;

    @JsonProperty("isCorrect")
    public boolean isCorrect() {
        return isCorrect;
    }

    @JsonProperty("isCorrect")
    public void setCorrect(boolean isCorrect) {
        this.isCorrect = isCorrect;
    }

    @JsonProperty("correct")
    public void setCorrectLegacy(boolean correct) {
        this.isCorrect = correct;
    }
}

