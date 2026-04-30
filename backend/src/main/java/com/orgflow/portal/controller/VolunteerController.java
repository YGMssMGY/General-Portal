package com.orgflow.portal.controller;

import com.orgflow.portal.dto.Dtos.VolunteerSlotDto;
import com.orgflow.portal.service.VolunteerService;
import java.util.List;
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
    public List<VolunteerSlotDto> listSlots() {
        return volunteerService.listSlots();
    }
}
