import { useState } from "react";
import { Box, Text, useInput } from "ink";

export default function SelectList({
    items,
    onSelect,
    active = true,
}: {
    items: string[];
    onSelect: (item: string, index: number) => void;
    active?: boolean;
}) {
    const [index, setIndex] = useState(0);
    useInput(
        (input, key) => {
            if (key.upArrow) setIndex((i) => (i - 1 + items.length) % items.length);
            else if (key.downArrow) setIndex((i) => (i + 1) % items.length);
            else if (key.return && items[index] !== undefined) onSelect(items[index], index);
        },
        { isActive: active && items.length > 0 },
    );
    return (
        <Box flexDirection="column">
            {items.map((item, i) => (
                <Text key={item} color={i === index ? "cyan" : undefined} bold={i === index}>
                    {i === index ? "> " : "  "}
                    {item}
                </Text>
            ))}
        </Box>
    );
}
