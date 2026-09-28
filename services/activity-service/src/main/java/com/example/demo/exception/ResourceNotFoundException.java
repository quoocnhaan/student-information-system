package com.example.demo.exception;

public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(String message) {
        super(message);
    }

    public static ResourceNotFoundException of(String entityName, String id) {
        return new ResourceNotFoundException(entityName + " khong ton tai voi id: " + id);
    }
}
