package com.orgflow.portal.service;

import com.orgflow.portal.dto.Dtos.CreatePublicEventRequest;
import com.orgflow.portal.dto.Dtos.PublicEventDto;
import com.orgflow.portal.entity.PublicEvent;
import com.orgflow.portal.exception.ResourceNotFoundException;
import com.orgflow.portal.repository.PublicEventRepository;
import java.util.Objects;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PublicEventService {
    private final CurrentUserService currentUserService;
    private final PublicEventRepository repository;

    public PublicEventService(CurrentUserService currentUserService, PublicEventRepository repository) {
        this.currentUserService = currentUserService;
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public Page<PublicEventDto> listPublic(Pageable pageable) {
        return repository.findByWorkspaceOrderByDateDesc(currentUserService.currentWorkspace(), pageable)
            .map(e -> new PublicEventDto(e.getId(), e.getTitle(), e.getDate(), e.getDescription(), e.getCategory()));
    }

    @Transactional
    public PublicEventDto create(CreatePublicEventRequest request) {
        var e = repository.save(new PublicEvent(currentUserService.currentWorkspace(), request.title(), request.date(), request.description(), request.category()));
        return new PublicEventDto(e.getId(), e.getTitle(), e.getDate(), e.getDescription(), e.getCategory());
    }

    @Transactional
    public PublicEventDto update(UUID id, CreatePublicEventRequest request) {
        PublicEvent e = repository.findById(Objects.requireNonNull(id)).orElseThrow(() -> new ResourceNotFoundException("PublicEvent"));
        e.update(request.title(), request.date(), request.description(), request.category());
        return new PublicEventDto(e.getId(), e.getTitle(), e.getDate(), e.getDescription(), e.getCategory());
    }

    @Transactional
    public void delete(UUID id) {
        repository.deleteById(Objects.requireNonNull(id));
    }
}
