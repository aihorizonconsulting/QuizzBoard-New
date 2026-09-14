package com.iahorizonplus.quizzboardbackend.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record LinkDto(
        String rel,
        String href,
        String method,
        String type
) {
    public static LinkDto of(String rel, String href, String method) {
        return new LinkDto(rel, href, method, "application/json");
    }

    public static LinkDto of(String rel, String href, String method, String type) {
        return new LinkDto(rel, href, method, type);
    }
}
