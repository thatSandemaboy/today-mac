# Today

A keyboard-first Kanban to-do app for Mac that respects how you actually think about work.

![Today App](https://img.shields.io/badge/platform-macOS-lightgrey) ![Electron](https://img.shields.io/badge/electron-28.0.0-blue)

## Philosophy

Most to-do apps fail because they treat all tasks equally. But that's not how our brains work.

**Today** is built around a simple truth: you don't need to see everything at once. You need to see what matters *right now*.

### The Three-Bracket System

Your tasks live in three mental spaces:

1. **This Week** — What you're committed to accomplishing this week. Not a backlog. Not "someday." This week.

2. **Today** — The tasks you've pulled from your week into today's focus. This is your battlefield.

3. **Done** — Completed work. Visible proof of progress. Auto-archived after 7 days.

Plus **Monthly Goals** always visible at the top — your north star that keeps daily tasks aligned with bigger objectives.

### Why This Works

- **No infinite backlogs** — If it's not happening this week, it doesn't belong here
- **Daily intention-setting** — Each morning, pull tasks from "This Week" into "Today"
- **Visible progress** — Done items show *when* you completed them
- **Plain text storage** — Your tasks live in `~/.today/today.md`, editable anywhere

## Features

- **Keyboard-first** — Vim-style navigation, shortcuts for everything
- **Ghost Capture** — Global hotkey (`Cmd+Option+N`) to capture tasks from anywhere
- **Monk Mode** — Built-in 25-minute focus timer
- **Standup Mode** — One-key copy of yesterday's done + today's plan
- **Native Mac feel** — Vibrancy, dark mode, traffic light positioning
- **Plain Markdown backend** — Edit your tasks in any text editor
- **Tactile sounds** — Subtle audio feedback (toggleable)

## Installation

### Option 1: Download Release

1. Download the latest `.dmg` from [Releases](../../releases)
2. Open the DMG and drag **Today** to Applications
3. First launch: Right-click → Open (required for unsigned apps)

### Option 2: Build from Source

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/today-mac.git
cd today-mac

# Install dependencies
npm install

# Run in development
npm start

# Build for distribution
npm run build
```

## Keyboard Shortcuts

### Navigation
| Key | Action |
|-----|--------|
| `j` / `↓` | Move down |
| `k` / `↑` | Move up |
| `h` / `←` | Move to column left |
| `l` / `→` | Move to column right |
| `1` `2` `3` | Jump to column |
| `g` | Jump to goals |

### Actions
| Key | Action |
|-----|--------|
| `n` | New task in current column |
| `Enter` | Edit selected task |
| `Tab` (while editing) | Save and add notes |
| `d` | Mark as done |
| `Backspace` | Delete task |
| `Space` | Move task right (week→today→done) |
| `Shift+Space` | Move task left |

### Features
| Key | Action |
|-----|--------|
| `Cmd+Shift+Space` | Quick capture (brings app to front) |
| `Cmd+Option+N` | Ghost capture (floating input from anywhere) |
| `m` | Toggle Monk Mode (25-min timer) |
| `s` | Standup mode (copy progress to clipboard) |
| `o` | Open markdown file in default editor |
| `u` | Undo |
| `Cmd+z` | Undo |

### Task Features
| Key | Action |
|-----|--------|
| `z` | Snooze task (hide until tomorrow) |
| Numbers in edit | Add time estimate (e.g., "Write report 2h") |

## Data Format

Your tasks are stored in `~/.today/today.md` as plain Markdown:

```markdown
# Monthly Goals
- Ship the new feature
- Exercise 3x per week

# This Week
- Review pull requests
- Prepare presentation
  > Add slides for Q3 metrics
  Goal: Ship the new feature

# Today
- Morning standup
- Fix login bug 2h

# Done
- ~~Update documentation~~ *2h ago*
- ~~Deploy to staging~~ *yesterday*
```

### Task Syntax
- Basic task: `- Task name`
- With time estimate: `- Task name 2h` or `- Task name 30m`
- With notes: Indented `> Note text` on next line
- Linked to goal: Indented `Goal: Goal name` on next line
- Completed: `- ~~Task name~~ *time ago*`

## Development

```bash
# Run the app
npm start

# Package for macOS
npm run build

# Create unpacked build (faster, for testing)
npm run pack
```

## License

MIT

---

*Built for people who think in weeks, work in days, and ship in hours.*
