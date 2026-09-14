package com.iahorizonplus.quizzboardbackend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "course_chapters")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CourseChapter {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "order_index")
    private int order;

    @Column(nullable = false, length = 250)
    private String title;

    @Column(length = 1000)
    private String summary;

    @Column(columnDefinition = "TEXT")
    private String content; // Structured Markdown content

    @Builder.Default
    private int estimatedMinutes = 30;

    @Builder.Default
    private boolean hasQuiz = false;

    private String quizTitle;
    private Integer quizQuestionsCount;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id")
    @JsonIgnore
    private Course course;
}
