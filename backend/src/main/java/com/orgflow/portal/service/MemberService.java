package com.orgflow.portal.service;

import com.orgflow.portal.dto.Dtos.MemberDto;
import com.orgflow.portal.entity.Membership;
import com.orgflow.portal.repository.MembershipRepository;
import com.orgflow.portal.security.Permissions;
import java.util.List;
import java.util.Map;
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
}
