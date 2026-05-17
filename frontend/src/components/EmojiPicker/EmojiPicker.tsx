import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  return (
    <div style={{ position: "absolute", bottom: "100%", right: 0, zIndex: 100 }}>
      <div style={{ position: "fixed", inset: 0 }} onClick={onClose} aria-hidden="true" />
      <div style={{ position: "relative" }}>
        <Picker
          data={data}
          onEmojiSelect={(emoji: { native: string }) => onSelect(emoji.native)}
          theme="auto"
          previewPosition="none"
          skinTonePosition="none"
        />
      </div>
    </div>
  );
}
