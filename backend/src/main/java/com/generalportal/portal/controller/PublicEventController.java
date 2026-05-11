package com.orgflow.portal.controller;

import com.orgflow.portal.dto.Dtos.CreatePublicEventRequest;
import com.orgflow.portal.dto.Dtos.PublicEventDto;
import com.orgflow.portal.service.PublicEventService;
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
public class PublicEventController {
    private final PublicEventService service;

    public PublicEventController(PublicEventService service) {
        this.service = service;
    }

    @GetMapping("/public")
    public Page<PublicEventDto> listPublic(@PageableDefault(size = 25) Pageable pageable) {
        return service.listPublic(pageable);
    }

    @PostMapping("/public")
    @PreAuthorize("hasAuthority('events:write')")
    public ResponseEntity<PublicEventDto> create(@Valid @RequestBody CreatePublicEventRequest request) {
        PublicEventDto dto = service.create(request);
        return ResponseEntity.created(Objects.requireNonNull(URI.create("/api/events/public/" + dto.id()))).body(dto);
    }

    @PatchMapping("/public/{id}")
    @PreAuthorize("hasAuthority('events:write')")
    public PublicEventDto update(@PathVariable UUID id, @Valid @RequestBody CreatePublicEventRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/public/{id}")
    @PreAuthorize("hasAuthority('events:write')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
