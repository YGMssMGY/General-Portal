package com.orgflow.portal.service;

import com.orgflow.portal.dto.Dtos.CreateVolunteerSlotRequest;
import com.orgflow.portal.dto.Dtos.VolunteerSlotDto;
import com.orgflow.portal.entity.VolunteerSlot;
import com.orgflow.portal.repository.VolunteerSlotRepository;
import com.orgflow.portal.security.Permissions;
import java.util.Objects;
import java.util.UUID;
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

    @Transactional
    public VolunteerSlotDto createSlot(CreateVolunteerSlotRequest request) {
        permissionService.require(Permissions.VOLUNTEERS_WRITE);
        var slot = new VolunteerSlot(currentUserService.currentWorkspace(), request.title(), request.eventName(), request.startsAt(), request.capacity(), 0, request.hours());
        return DtoMapper.toVolunteerSlotDto(volunteerSlotRepository.save(slot));
    }

    @Transactional
    public void deleteSlot(UUID id) {
        permissionService.require(Permissions.VOLUNTEERS_WRITE);
        volunteerSlotRepository.deleteById(Objects.requireNonNull(id));
    }
}
