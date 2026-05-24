"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Code2, GraduationCap } from "lucide-react";

const portals = [
  {
    id: "developers",
    name: "Developers' Club",
    description:
      "Build software, contribute to open source, and grow your engineering skills through hands-on projects and workshops.",
    icon: Code2,
  },
  {
    id: "stuco",
    name: "Student Council",
    description:
      "Lead student initiatives, organize events, and represent the student body in shaping campus life.",
    icon: GraduationCap,
  },
] as const;

export default function HomePage() {
  const router = useRouter();
  const [hovered, setHovered] = useState<string | null>(null);

  function handleSelect(id: string) {
    document.cookie = `portal=${id}; path=/; SameSite=Lax`;
    router.push(`/${id}/dashboard`);
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100dvh",
        padding: "24px",
        backgroundColor: "var(--color-bg-secondary)",
      }}
    >
      <div style={{ maxWidth: "720px", width: "100%" }}>
        <div style={{ marginBottom: "48px", textAlign: "center" }}>
          <h1
            style={{
              fontSize: "28px",
              fontWeight: 700,
              color: "var(--color-text)",
              margin: 0,
              lineHeight: 1.3,
            }}
          >
            General Portal
          </h1>
          <p
            style={{
              fontSize: "15px",
              color: "var(--color-text-secondary)",
              marginTop: "8px",
              marginBottom: 0,
            }}
          >
            Choose your portal
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          {portals.map((portal) => {
            const Icon = portal.icon;
            const isHovered = hovered === portal.id;

            return (
              <button
                key={portal.id}
                type="button"
                onClick={() => handleSelect(portal.id)}
                onMouseEnter={() => setHovered(portal.id)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  padding: "40px 24px",
                  backgroundColor: "var(--color-bg)",
                  border: `2px solid ${isHovered ? "var(--color-primary)" : "var(--color-border)"}`,
                  borderRadius: "var(--radius-md)",
                  cursor: "pointer",
                  transition: "border-color 150ms ease, background-color 150ms ease",
                  outline: "none",
                  minHeight: "220px",
                }}
                onFocus={() => setHovered(portal.id)}
                onBlur={() => setHovered(null)}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "64px",
                    height: "64px",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: isHovered
                      ? "var(--color-primary-light)"
                      : "var(--color-bg-secondary)",
                    marginBottom: "20px",
                    transition: "background-color 150ms ease",
                  }}
                >
                  <Icon
                    size={28}
                    style={{
                      color: isHovered
                        ? "var(--color-primary)"
                        : "var(--color-text-secondary)",
                      transition: "color 150ms ease",
                    }}
                  />
                </div>
                <h2
                  style={{
                    fontSize: "20px",
                    fontWeight: 600,
                    color: "var(--color-text)",
                    margin: 0,
                    marginBottom: "8px",
                  }}
                >
                  {portal.name}
                </h2>
                <p
                  style={{
                    fontSize: "14px",
                    color: "var(--color-text-secondary)",
                    margin: 0,
                    lineHeight: 1.5,
                    maxWidth: "260px",
                  }}
                >
                  {portal.description}
                </p>
              </button>
            );
          })}
        </div>

        <a
          href="/showcase"
          style={{
            display: "block",
            textAlign: "center",
            marginTop: "32px",
            fontSize: "14px",
            color: "var(--color-primary)",
            fontWeight: 500,
            textDecoration: "none",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.textDecoration = "underline"; }}
          onMouseLeave={(e) => { e.currentTarget.style.textDecoration = "none"; }}
        >
          View public showcase &rarr;
        </a>
      </div>
    </div>
  );
}
