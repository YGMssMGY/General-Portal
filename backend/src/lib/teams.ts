export async function sendTeamsMessage(
    webhookUrl: string,
    title: string,
    message: string,
    color?: string,
) {
    const card = {
        "@type": "MessageCard",
        "@context": "http://schema.org/extensions",
        themeColor: color || "0f62fe",
        title,
        text: message,
    };
    await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(card),
    });
}
