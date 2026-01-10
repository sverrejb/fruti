# Firefox extension: Recently Used Tabs Indicator 

A Firefox extension that tracks your 5 most recently used tabs and adds visual indicators to their titles, making it easy to spot and switch back to tabs you were just using.


Choose from these built-in styles:

- **Simple Numbers**: [1] → [2] → [3] → [4] → [5]
- **Colored Circles**: 🔴 → 🟠 → 🟡 → 🟢 → 🔵
- **Colored Squares**: 🟥 → 🟧 → 🟨 → 🟩 → 🟦
- **Moon Phases**: 🌕 → 🌖 → 🌗 → 🌘 → 🌑
- **Custom**: Define your own 5 indicators

## Permissions

This extension requires:
- **Access to all websites** - Needed to modify tab titles. The extension only reads `document.title` and adds a prefix indicator - it does not access any other page content or data.
- **Tabs** - To track tab activation events
- **Storage** - To remember your indicator style preference
