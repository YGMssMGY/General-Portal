package com.orgflow.portal.controller;

import com.orgflow.portal.dto.Dtos.EventDto;
import com.orgflow.portal.service.EventService;
import java.util.List;
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
    public List<EventDto> listEvents() {
        return eventService.listEvents();
    }
}
