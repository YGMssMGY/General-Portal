package com.orgflow.portal.service;

import com.orgflow.portal.dto.Dtos.MemberDto;
import com.orgflow.portal.entity.Membership;
import com.orgflow.portal.repository.MembershipRepository;
import com.orgflow.portal.security.Permissions;
import java.util.List;
import java.util.Map;
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
    public List<MemberDto> listMembers() {
        permissionService.require(Permissions.MEMBERS_READ);
        List<Membership> memberships = membershipRepository.findByWorkspaceOrderByUser_DisplayNameAsc(currentUserService.currentWorkspace());
        Map<Membership, List<String>> permissionsMap = permissionService.permissionsForMemberships(memberships);
        return memberships.stream()
            .map(membership -> DtoMapper.toMemberDto(membership, permissionsMap.getOrDefault(membership, List.of())))
            .toList();
    }
}
