package com.generalportal.portal.service;

import com.generalportal.portal.dto.Dtos.CreateEventRequest;
import com.generalportal.portal.dto.Dtos.EventDto;
import com.generalportal.portal.dto.Dtos.UpdateEventRequest;
import com.generalportal.portal.entity.EventItem;
import com.generalportal.portal.exception.ResourceNotFoundException;
import com.generalportal.portal.repository.EventRepository;
import com.generalportal.portal.security.Permissions;
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
