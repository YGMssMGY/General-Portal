package com.generalportal.portal.exception;

import com.generalportal.portal.dto.Dtos.ApiErrorDto;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {
    private static final Logger logger = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(PermissionDeniedException.class)
    ResponseEntity<ApiErrorDto> handlePermissionDenied(PermissionDeniedException exception, HttpServletRequest request) {
        logger.warn("Permission denied: {}", exception.getMessage());
        return error(HttpStatus.FORBIDDEN, "permission_denied", exception.getMessage(), request);
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    ResponseEntity<ApiErrorDto> handleNotFound(ResourceNotFoundException exception, HttpServletRequest request) {
        return error(HttpStatus.NOT_FOUND, "not_found", exception.getMessage(), request);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ApiErrorDto> handleValidation(MethodArgumentNotValidException exception, HttpServletRequest request) {
        String message = exception.getBindingResult().getFieldErrors().stream()
            .findFirst()
            .map(this::formatFieldError)
            .orElse("Request validation failed");
        return error(HttpStatus.BAD_REQUEST, "validation_failed", message, request);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    ResponseEntity<ApiErrorDto> handleIllegalArgument(IllegalArgumentException exception, HttpServletRequest request) {
        return error(HttpStatus.BAD_REQUEST, "bad_request", exception.getMessage(), request);
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ApiErrorDto> handleUnexpected(Exception exception, HttpServletRequest request) {
        logger.error("Unexpected server error: {}", exception.getMessage(), exception);
        return error(HttpStatus.INTERNAL_SERVER_ERROR, "internal_error", "Unexpected server error", request);
    }

    private String formatFieldError(FieldError error) {
        return error.getField() + " " + error.getDefaultMessage();
    }

    private ResponseEntity<ApiErrorDto> error(HttpStatus status, String code, String message, HttpServletRequest request) {
        return ResponseEntity.status(status.value()).body(new ApiErrorDto(Instant.now(), status.value(), code, message, request.getRequestURI()));
    }
}
