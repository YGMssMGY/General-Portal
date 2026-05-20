import { Link } from "react-router-dom";
import { Button, Tile } from "@carbon/react";
import { Group, Launch, ArrowRight } from "@carbon/icons-react";

const leadership = [
    { role: "Admin", desc: "Full system access — manages workspace configuration and security." },
    {
        role: "President / Vice President",
        desc: "Leads the organization, sets vision, manages members and finances.",
    },
    { role: "Officer", desc: "Manages operations, events, volunteers, and resource coordination." },
    {
        role: "Member / Representative",
        desc: "Participates in tasks, proposals, events, and team communication.",
    },
];

export function AboutPage() {
    return (
        <div style={{ margin: "0 auto", maxWidth: "80rem", padding: "1.5rem 1rem" }}>
            <h1 style={{ fontSize: "2rem", fontWeight: 600, color: "var(--cds-text-primary)" }}>
                About Us
            </h1>
            <p
                style={{
                    marginTop: "1rem",
                    fontSize: "1rem",
                    lineHeight: 1.6,
                    color: "var(--cds-text-secondary)",
                    maxWidth: "48rem",
                }}
            >
                The Developers' Club and Student Council work together to create a vibrant community
                of student leaders and innovators. We organize events, manage resources, and
                represent the student body.
            </p>

            <div
                style={{
                    marginTop: "3rem",
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                    gap: "1rem",
                    overflowX: "auto",
                    maxWidth: "100%",
                }}
            >
                <Tile>
                    <Group size={32} style={{ color: "#0f62fe" }} aria-hidden="true" />
                    <h2
                        style={{
                            marginTop: "1rem",
                            fontSize: "1.25rem",
                            fontWeight: 600,
                            color: "var(--cds-text-primary)",
                        }}
                    >
                        Our Mission
                    </h2>
                    <p
                        style={{
                            marginTop: "0.5rem",
                            fontSize: "0.875rem",
                            lineHeight: 1.5,
                            color: "var(--cds-text-secondary)",
                        }}
                    >
                        To foster a collaborative environment where students can develop technical
                        skills, leadership abilities, and meaningful connections that last beyond
                        their school years.
                    </p>
                </Tile>

                <Tile>
                    <Launch size={32} style={{ color: "#0f62fe" }} aria-hidden="true" />
                    <h2
                        style={{
                            marginTop: "1rem",
                            fontSize: "1.25rem",
                            fontWeight: 600,
                            color: "var(--cds-text-primary)",
                        }}
                    >
                        Our Vision
                    </h2>
                    <p
                        style={{
                            marginTop: "0.5rem",
                            fontSize: "0.875rem",
                            lineHeight: 1.5,
                            color: "var(--cds-text-secondary)",
                        }}
                    >
                        A school community where every student has the opportunity to explore
                        technology, develop as a leader, and contribute to meaningful projects.
                    </p>
                </Tile>
            </div>

            <section style={{ marginTop: "4rem" }}>
                <h2
                    style={{
                        fontSize: "1.5rem",
                        fontWeight: 600,
                        color: "var(--cds-text-primary)",
                    }}
                >
                    Leadership Structure
                </h2>
                <div
                    style={{
                        marginTop: "1.5rem",
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                        gap: "1rem",
                    }}
                >
                    {leadership.map((item) => (
                        <div
                            key={item.role}
                            style={{
                                borderLeft: "2px solid #0f62fe",
                                background: "var(--cds-layer)",
                                padding: "1rem",
                            }}
                        >
                            <h3
                                style={{
                                    fontSize: "1rem",
                                    fontWeight: 600,
                                    color: "var(--cds-text-primary)",
                                }}
                            >
                                {item.role}
                            </h3>
                            <p
                                style={{
                                    marginTop: "0.25rem",
                                    fontSize: "0.875rem",
                                    color: "var(--cds-text-secondary)",
                                }}
                            >
                                {item.desc}
                            </p>
                        </div>
                    ))}
                </div>
            </section>

            <section
                style={{
                    marginTop: "4rem",
                    borderTop: "1px solid var(--cds-border-subtle)",
                    paddingTop: "3rem",
                }}
            >
                <h2
                    style={{
                        fontSize: "1.5rem",
                        fontWeight: 600,
                        color: "var(--cds-text-primary)",
                    }}
                >
                    Interested in Joining?
                </h2>
                <p
                    style={{
                        marginTop: "1rem",
                        fontSize: "1rem",
                        color: "var(--cds-text-secondary)",
                        maxWidth: "42rem",
                    }}
                >
                    We welcome all students regardless of experience level. Whether you want to
                    learn to code, organize events, or develop leadership skills, there's a place
                    for you.
                </p>
                <Link to="/admin" style={{ marginTop: "1.5rem", display: "inline-block" }}>
                    <Button renderIcon={ArrowRight}>Access Member Portal</Button>
                </Link>
            </section>
        </div>
    );
}
