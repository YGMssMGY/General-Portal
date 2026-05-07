package com.orgflow.portal.controller;

import com.orgflow.portal.dto.Dtos.CreateProposalRequest;
import com.orgflow.portal.dto.Dtos.ProposalDto;
import com.orgflow.portal.service.ProposalService;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.Objects;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/proposals")
public class ProposalController {
    private final ProposalService proposalService;

    public ProposalController(ProposalService proposalService) {
        this.proposalService = proposalService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('proposals:read')")
    public Page<ProposalDto> listProposals(@PageableDefault(size = 25) Pageable pageable) {
        return proposalService.listProposals(pageable);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('proposals:write')")
    public ResponseEntity<ProposalDto> createProposal(@Valid @RequestBody CreateProposalRequest request) {
        ProposalDto proposal = proposalService.createProposal(request);
        return ResponseEntity.created(Objects.requireNonNull(URI.create("/api/proposals/" + proposal.id()))).body(proposal);
    }
}
