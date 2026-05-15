package com.generalportal.portal.service;

import com.generalportal.portal.dto.Dtos.CreateVolunteerSlotRequest;
import com.generalportal.portal.dto.Dtos.UpdateVolunteerSlotRequest;
import com.generalportal.portal.dto.Dtos.VolunteerSlotDto;
import com.generalportal.portal.exception.ResourceNotFoundException;
import com.generalportal.portal.entity.VolunteerSlot;
import com.generalportal.portal.repository.VolunteerSlotRepository;
import com.generalportal.portal.security.Permissions;
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

    @Transactional
    public VolunteerSlotDto updateSlot(UUID id, UpdateVolunteerSlotRequest request) {
        permissionService.require(Permissions.VOLUNTEERS_WRITE);
        var slot = volunteerSlotRepository.findById(Objects.requireNonNull(id))
            .orElseThrow(() -> new ResourceNotFoundException("VolunteerSlot"));
        if (request.capacity() != null) {
            slot.setCapacity(request.capacity());
        }
        if (request.filled() != null) {
            slot.setFilled(request.filled());
        }
        return DtoMapper.toVolunteerSlotDto(slot);
    }
}
