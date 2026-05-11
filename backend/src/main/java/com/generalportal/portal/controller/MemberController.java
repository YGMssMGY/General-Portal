package com.generalportal.portal.controller;

import com.generalportal.portal.dto.Dtos.MemberDto;
import com.generalportal.portal.dto.Dtos.UpdateMemberRequest;
import com.generalportal.portal.service.MemberService;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/members")
public class MemberController {
    private final MemberService memberService;

    public MemberController(MemberService memberService) {
        this.memberService = memberService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('members:read')")
    public Page<MemberDto> listMembers(@PageableDefault(size = 25) Pageable pageable) {
        return memberService.listMembers(pageable);
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAuthority('members:write')")
    public MemberDto updateMember(@PathVariable UUID id, @Valid @RequestBody UpdateMemberRequest request) {
        return memberService.updateMember(id, request);
    }
}
