package com.spendwise.common;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.stream.Collectors;

/** Every error response has the same shape: {"error": "message"}. No stack traces are exposed. */
@RestControllerAdvice
public class ApiExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

    public record ErrorBody(String error) {
    }

    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<ErrorBody> handleStatus(ResponseStatusException e) {
        HttpStatus status = HttpStatus.valueOf(e.getStatusCode().value());
        return build(status, e.getReason() != null ? e.getReason() : status.getReasonPhrase());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ErrorBody> handleValidation(MethodArgumentNotValidException e) {
        String message = e.getBindingResult().getFieldErrors().stream()
                .map(f -> f.getField() + " " + f.getDefaultMessage())
                .collect(Collectors.joining("; "));
        return build(HttpStatus.BAD_REQUEST, message.isBlank() ? "Validation failed" : message);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<ErrorBody> handleUnreadable(HttpMessageNotReadableException e) {
        return build(HttpStatus.BAD_REQUEST, "Malformed or invalid request body");
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    ResponseEntity<ErrorBody> handleTypeMismatch(MethodArgumentTypeMismatchException e) {
        return build(HttpStatus.BAD_REQUEST, "Invalid value for parameter '" + e.getName() + "'");
    }

    @ExceptionHandler(NoResourceFoundException.class)
    ResponseEntity<ErrorBody> handleNotFound(NoResourceFoundException e) {
        return build(HttpStatus.NOT_FOUND, "Not found");
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    ResponseEntity<ErrorBody> handleMethod(HttpRequestMethodNotSupportedException e) {
        return build(HttpStatus.METHOD_NOT_ALLOWED, "Method not allowed");
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<ErrorBody> handleIntegrity(DataIntegrityViolationException e) {
        return build(HttpStatus.CONFLICT, "Request conflicts with existing data");
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ErrorBody> handleUnexpected(Exception e) {
        log.error("Unexpected error", e);
        return build(HttpStatus.INTERNAL_SERVER_ERROR, "Unexpected server error");
    }

    private static ResponseEntity<ErrorBody> build(HttpStatus status, String message) {
        return ResponseEntity.status(status).body(new ErrorBody(message));
    }
}
