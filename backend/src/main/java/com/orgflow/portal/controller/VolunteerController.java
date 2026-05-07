package com.orgflow.portal.controller;

import com.orgflow.portal.dto.Dtos.VolunteerSlotDto;
import com.orgflow.portal.service.VolunteerService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
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
}
