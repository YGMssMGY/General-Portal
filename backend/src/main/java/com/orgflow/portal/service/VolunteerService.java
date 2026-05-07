package com.orgflow.portal.service;

import com.orgflow.portal.dto.Dtos.VolunteerSlotDto;
import com.orgflow.portal.repository.VolunteerSlotRepository;
import com.orgflow.portal.security.Permissions;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class VolunteerService {
    private final CurrentUserService currentUserService;
    private final PermissionService permissionService;
    private final VolunteerSlotRepository volunteerSlotRepository;

    public VolunteerService(CurrentUserService currentUserService, PermissionService permissionService, VolunteerSlotRepository volunteerSlotRepository) {
        this.currentUserService = currentUserService;
        this.permissionService = permissionService;
        this.volunteerSlotRepository = volunteerSlotRepository;
    }

    @Transactional(readOnly = true)
    public Page<VolunteerSlotDto> listSlots(Pageable pageable) {
        permissionService.require(Permissions.VOLUNTEERS_READ);
        return volunteerSlotRepository.findByWorkspace(currentUserService.currentWorkspace(), pageable)
            .map(DtoMapper::toVolunteerSlotDto);
    }
}
