package com.generalportal.portal.service;

import com.generalportal.portal.dto.Dtos.CreatePhotoRequest;
import com.generalportal.portal.dto.Dtos.PhotoDto;
import com.generalportal.portal.entity.Photo;
import com.generalportal.portal.exception.ResourceNotFoundException;
import com.generalportal.portal.repository.PhotoRepository;
import java.util.Objects;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PhotoService {
    private final CurrentUserService currentUserService;
    private final PhotoRepository repository;

    public PhotoService(CurrentUserService currentUserService, PhotoRepository repository) {
        this.currentUserService = currentUserService;
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public Page<PhotoDto> listPhotos(Pageable pageable) {
        return repository.findByWorkspaceOrderByDateDesc(currentUserService.currentWorkspace(), pageable)
            .map(p -> new PhotoDto(p.getId(), p.getTitle(), p.getDate(), p.getDescription()));
    }

    @Transactional
    public PhotoDto create(CreatePhotoRequest request) {
        var p = repository.save(new Photo(currentUserService.currentWorkspace(), request.title(), request.date(), request.description()));
        return new PhotoDto(p.getId(), p.getTitle(), p.getDate(), p.getDescription());
    }

    @Transactional
    public PhotoDto update(UUID id, CreatePhotoRequest request) {
        Photo p = repository.findById(Objects.requireNonNull(id)).orElseThrow(() -> new ResourceNotFoundException("Photo"));
        p.update(request.title(), request.date(), request.description());
        return new PhotoDto(p.getId(), p.getTitle(), p.getDate(), p.getDescription());
    }

    @Transactional
    public void delete(UUID id) {
        repository.deleteById(Objects.requireNonNull(id));
    }
}
