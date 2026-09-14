package com.iahorizonplus.quizzboardbackend.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record FieldErrorDetail(
        String field,
        Object rejectedValue,
        String message
) {}
