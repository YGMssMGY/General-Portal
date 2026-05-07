package com.orgflow.portal.service;

import com.orgflow.portal.dto.Dtos.EventDto;
import com.orgflow.portal.repository.EventRepository;
import com.orgflow.portal.security.Permissions;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EventService {
    private final CurrentUserService currentUserService;
    private final PermissionService permissionService;
    private final EventRepository eventRepository;

    public EventService(CurrentUserService currentUserService, PermissionService permissionService, EventRepository eventRepository) {
        this.currentUserService = currentUserService;
        this.permissionService = permissionService;
        this.eventRepository = eventRepository;
    }

    @Transactional(readOnly = true)
    public Page<EventDto> listEvents(Pageable pageable) {
        permissionService.require(Permissions.EVENTS_READ);
        return eventRepository.findByWorkspace(currentUserService.currentWorkspace(), pageable)
            .map(DtoMapper::toEventDto);
    }
}
