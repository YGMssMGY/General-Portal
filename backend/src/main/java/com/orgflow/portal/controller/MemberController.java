package com.orgflow.portal.controller;

import com.orgflow.portal.dto.Dtos.MemberDto;
import com.orgflow.portal.service.MemberService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
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
}
