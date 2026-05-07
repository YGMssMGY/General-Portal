package com.orgflow.portal.controller;

import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/events")
public class PublicEventController {
    public record PublicEvent(String id, String title, String date, String description, String photoUrl, String category) {}

    @GetMapping("/public")
    public List<PublicEvent> listPublicEvents() {
        return List.of(
            new PublicEvent("pub-1", "Annual Hackathon 2025", "2025-11-15", "Our flagship event brought together over 200 participants for a weekend of innovation and collaboration.", "", "Competition"),
            new PublicEvent("pub-2", "Spring Coding Workshop", "2025-04-10", "Hands-on sessions covering web development, Python, and introductory programming for all grades.", "", "Workshop"),
            new PublicEvent("pub-3", "Leadership Summit", "2025-09-22", "An inspiring gathering of students, mentors, and industry professionals sharing knowledge and experiences.", "", "Conference"),
            new PublicEvent("pub-4", "Community Tech Fair", "2025-06-05", "Students showcased their semester projects to parents, teachers, and local tech companies.", "", "Community"),
            new PublicEvent("pub-5", "Robotics Competition", "2025-03-18", "Teams competed in autonomous and driver-controlled challenges with custom-built robots.", "", "Competition"),
            new PublicEvent("pub-6", "Alumni Networking Night", "2025-12-01", "Former club members returned to share career advice and network with current students.", "", "Social"),
            new PublicEvent("pub-7", "Open Source Bootcamp", "2025-07-14", "A week-long intensive program introducing students to open source contribution workflows.", "", "Workshop"),
            new PublicEvent("pub-8", "Game Jam Weekend", "2025-02-28", "48-hour game development marathon with teams creating playable games from scratch.", "", "Competition"),
            new PublicEvent("pub-9", "Career Development Panel", "2025-05-20", "Industry professionals from Microsoft, Google, and local startups shared career advice.", "", "Conference"),
            new PublicEvent("pub-10", "Science Exhibition", "2025-10-08", "A celebration of creativity and technical excellence across all grade levels.", "", "Community"),
            new PublicEvent("pub-11", "Cultural Festival", "2025-01-25", "Cross-club collaboration celebrating diverse cultures through food, music, and art.", "", "Social"),
            new PublicEvent("pub-12", "End-of-Year Celebration", "2025-12-18", "Closing ceremony recognizing outstanding members and celebrating the year's achievements.", "", "Social")
        );
    }
}
