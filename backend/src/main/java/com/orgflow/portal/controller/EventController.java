package com.orgflow.portal.controller;

import com.orgflow.portal.dto.Dtos.EventDto;
import com.orgflow.portal.service.EventService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
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
}
