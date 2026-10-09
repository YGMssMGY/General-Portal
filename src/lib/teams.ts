import { config } from "@/config";

const TEAMS_WEBHOOK_URL = config.teamsWebhookUrl;

interface TeamsCard {
    title: string;
    description: string;
    date: string;
    location?: string;
    url?: string;
}

export async function postEventToTeams(event: TeamsCard): Promise<boolean> {
    if (!TEAMS_WEBHOOK_URL) return false;

    try {
        const body = {
            "@type": "MessageCard",
            "@context": "http://schema.org/extensions",
            themeColor: "0f62fe",
            summary: event.title,
            sections: [
                {
                    activityTitle: event.title,
                    activitySubtitle: event.description,
                    facts: [
                        { name: "Date", value: event.date },
                        ...(event.location ? [{ name: "Location", value: event.location }] : []),
                    ],
                    potentialAction: event.url
                        ? [
                              {
                                  "@type": "OpenUri",
                                  name: "View Event",
                                  targets: [{ os: "default", uri: event.url }],
                              },
                          ]
                        : [],
                },
            ],
        };

        const res = await fetch(TEAMS_WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        return res.ok;
    } catch {
        return false;
    }
}
