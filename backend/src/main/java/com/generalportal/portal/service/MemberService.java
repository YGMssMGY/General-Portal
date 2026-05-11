package com.generalportal.portal.service;

import com.generalportal.portal.dto.Dtos.MemberDto;
import com.generalportal.portal.dto.Dtos.UpdateMemberRequest;
import com.generalportal.portal.entity.Membership;
import com.generalportal.portal.exception.ResourceNotFoundException;
import com.generalportal.portal.repository.MembershipRepository;
import com.generalportal.portal.security.Permissions;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MemberService {
    private final CurrentUserService currentUserService;
    private final PermissionService permissionService;
    private final MembershipRepository membershipRepository;

    public MemberService(CurrentUserService currentUserService, PermissionService permissionService, MembershipRepository membershipRepository) {
        this.currentUserService = currentUserService;
        this.permissionService = permissionService;
        this.membershipRepository = membershipRepository;
    }

    @Transactional(readOnly = true)
    public Page<MemberDto> listMembers(Pageable pageable) {
        permissionService.require(Permissions.MEMBERS_READ);
        var workspace = currentUserService.currentWorkspace();
        Page<Membership> page = membershipRepository.findByWorkspace(workspace, pageable);
        Map<Membership, List<String>> permissionsMap = permissionService.permissionsForMemberships(page.getContent());
        return page.map(membership -> DtoMapper.toMemberDto(membership, permissionsMap.getOrDefault(membership, List.of())));
    }

    @Transactional
    public MemberDto updateMember(UUID id, UpdateMemberRequest request) {
        permissionService.require(Permissions.MEMBERS_WRITE);
        Membership membership = membershipRepository.findById(Objects.requireNonNull(id)).orElseThrow(() -> new ResourceNotFoundException("Member"));
        membership.updatePosition(request.position(), request.accessLabel());
        return DtoMapper.toMemberDto(membership, List.of());
    }
}
