package com.generalportal.portal.exception;

public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String resourceName) {
        super(resourceName + " was not found");
    }
}
