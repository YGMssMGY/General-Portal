package com.orgflow.portal.controller;

import com.orgflow.portal.dto.Dtos.SearchResultDto;
import com.orgflow.portal.service.SearchService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/search")
public class SearchController {
    private final SearchService searchService;

    public SearchController(SearchService searchService) {
        this.searchService = searchService;
    }

    @GetMapping
    public List<SearchResultDto> search(@RequestParam(defaultValue = "") String q) {
        return searchService.search(q);
    }
}
