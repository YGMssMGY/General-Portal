package com.orgflow.portal.service;

import com.orgflow.portal.dto.Dtos.CreateEventRequest;
import com.orgflow.portal.dto.Dtos.EventDto;
import com.orgflow.portal.dto.Dtos.UpdateEventRequest;
import com.orgflow.portal.entity.EventItem;
import com.orgflow.portal.exception.ResourceNotFoundException;
import com.orgflow.portal.repository.EventRepository;
import com.orgflow.portal.security.Permissions;
import java.util.Objects;
import java.util.UUID;
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

    @Transactional
    public EventDto createEvent(CreateEventRequest request) {
        permissionService.require(Permissions.EVENTS_WRITE);
        var event = new EventItem(currentUserService.currentWorkspace(), request.title(), "draft", request.startsAt(), request.endsAt(), 0, java.math.BigDecimal.ZERO, java.math.BigDecimal.ZERO);
        return DtoMapper.toEventDto(eventRepository.save(event));
    }

    @Transactional
    public EventDto updateEvent(UUID id, UpdateEventRequest request) {
        permissionService.require(Permissions.EVENTS_WRITE);
        EventItem event = eventRepository.findById(Objects.requireNonNull(id)).orElseThrow(() -> new ResourceNotFoundException("Event"));
        event.update(request.title(), request.status(), request.startsAt(), request.endsAt(), request.progress());
        return DtoMapper.toEventDto(event);
    }

    @Transactional
    public void deleteEvent(UUID id) {
        permissionService.require(Permissions.EVENTS_WRITE);
        eventRepository.deleteById(Objects.requireNonNull(id));
    }
}
