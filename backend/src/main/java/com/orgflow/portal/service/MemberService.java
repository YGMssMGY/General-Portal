package com.orgflow.portal.service;

import com.orgflow.portal.dto.Dtos.MemberDto;
import com.orgflow.portal.repository.MembershipRepository;
import com.orgflow.portal.security.Permissions;
import java.util.List;
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
        return membershipRepository.findByWorkspaceOrderByUser_DisplayNameAsc(currentUserService.currentWorkspace()).stream()
            .map(membership -> DtoMapper.toMemberDto(membership, permissionService.permissionsForEmail(membership.getUser().getEmail())))
            .toList();
    }
}
