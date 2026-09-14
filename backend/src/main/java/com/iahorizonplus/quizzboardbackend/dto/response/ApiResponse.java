package com.iahorizonplus.quizzboardbackend.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;

import java.time.LocalDateTime;
import java.util.List;

@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiResponse<T>(
        int status,
        boolean success,
        String message,
        T data,
        List<FieldErrorDetail> errors,
        List<LinkDto> links,
        String path,
        LocalDateTime timestamp
) {
    public static <T> ApiResponse<T> ok(T data, String message, List<LinkDto> links, String path) {
        return ApiResponse.<T>builder()
                .status(200)
                .success(true)
                .message(message)
                .data(data)
                .links(links)
                .path(path)
                .timestamp(LocalDateTime.now())
                .build();
    }

    public static <T> ApiResponse<T> created(T data, String message, List<LinkDto> links, String path) {
        return ApiResponse.<T>builder()
                .status(201)
                .success(true)
                .message(message)
                .data(data)
                .links(links)
                .path(path)
                .timestamp(LocalDateTime.now())
                .build();
    }

    public static <T> ApiResponse<T> error(int status, String message, List<FieldErrorDetail> errors, List<LinkDto> links, String path) {
        return ApiResponse.<T>builder()
                .status(status)
                .success(false)
                .message(message)
                .errors(errors)
                .links(links)
                .path(path)
                .timestamp(LocalDateTime.now())
                .build();
    }
}
