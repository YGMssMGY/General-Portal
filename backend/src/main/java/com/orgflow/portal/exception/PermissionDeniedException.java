package com.orgflow.portal.exception;

public class PermissionDeniedException extends RuntimeException {
    public PermissionDeniedException(String permission) {
        super("Missing permission: " + permission);
    }
}
