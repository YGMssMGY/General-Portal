import ReactMarkdown from "react-markdown";

export function MarkdownRenderer({ children }: { children: string }) {
    return <ReactMarkdown>{children}</ReactMarkdown>;
}
