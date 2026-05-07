package com.orgflow.portal.controller;

import com.orgflow.portal.dto.Dtos.VolunteerSlotDto;
import com.orgflow.portal.dto.Dtos.CreateVolunteerSlotRequest;
import com.orgflow.portal.service.VolunteerService;
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
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/volunteers")
public class VolunteerController {
    private final VolunteerService volunteerService;

    public VolunteerController(VolunteerService volunteerService) {
        this.volunteerService = volunteerService;
    }

    @GetMapping("/slots")
    @PreAuthorize("hasAuthority('volunteers:read')")
    public Page<VolunteerSlotDto> listSlots(@PageableDefault(size = 25) Pageable pageable) {
        return volunteerService.listSlots(pageable);
    }

    @PostMapping("/slots")
    @PreAuthorize("hasAuthority('volunteers:write')")
    public ResponseEntity<VolunteerSlotDto> createSlot(@Valid @RequestBody CreateVolunteerSlotRequest request) {
        VolunteerSlotDto slot = volunteerService.createSlot(request);
        return ResponseEntity.created(Objects.requireNonNull(URI.create("/api/volunteers/slots/" + slot.id()))).body(slot);
    }

    @DeleteMapping("/slots/{id}")
    @PreAuthorize("hasAuthority('volunteers:write')")
    public ResponseEntity<Void> deleteSlot(@PathVariable UUID id) {
        volunteerService.deleteSlot(id);
        return ResponseEntity.noContent().build();
    }
}
