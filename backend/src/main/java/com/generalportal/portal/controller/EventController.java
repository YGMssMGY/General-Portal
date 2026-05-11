package com.orgflow.portal.controller;

import com.orgflow.portal.dto.Dtos.CreateEventRequest;
import com.orgflow.portal.dto.Dtos.EventDto;
import com.orgflow.portal.dto.Dtos.UpdateEventRequest;
import com.orgflow.portal.service.EventService;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.Objects;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/events")
public class EventController {
    private final EventService eventService;

    public EventController(EventService eventService) {
        this.eventService = eventService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('events:read')")
    public Page<EventDto> listEvents(@PageableDefault(size = 25) Pageable pageable) {
        return eventService.listEvents(pageable);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('events:write')")
    public ResponseEntity<EventDto> createEvent(@Valid @RequestBody CreateEventRequest request) {
        EventDto event = eventService.createEvent(request);
        return ResponseEntity.created(Objects.requireNonNull(URI.create("/api/events/" + event.id()))).body(event);
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAuthority('events:write')")
    public EventDto updateEvent(@PathVariable UUID id, @Valid @RequestBody UpdateEventRequest request) {
        return eventService.updateEvent(id, request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('events:write')")
    public ResponseEntity<Void> deleteEvent(@PathVariable UUID id) {
        eventService.deleteEvent(id);
        return ResponseEntity.noContent().build();
    }
}
