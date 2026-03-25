# Today

A keyboard-first Kanban to-do app for Mac that respects how you actually think about work.

![Today App](https://img.shields.io/badge/platform-macOS-lightgrey) ![Electron](https://img.shields.io/badge/electron-28.0.0-blue) ![Version](https://img.shields.io/badge/version-2.0.0-green)

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
- **Plain text storage** — Your tasks live in a `today.md` file you control, editable anywhere

## Features

- **Guided setup** — Choose where your tasks file lives on first launch (Obsidian vault, iCloud, anywhere)
- **Keyboard-first** — Vim-style navigation, shortcuts for everything
- **Ghost Capture** — Global hotkey (`Cmd+Option+N`) to capture tasks from anywhere
- **Focus Mode** — Built-in 25-minute focus timer with a single-task view
- **Standup Mode** — One-key copy of yesterday's done + today's plan
- **Task linking** — Connect related tasks across columns
- **Search** — Fuzzy search across all tasks with `/`
- **Daily carryover** — Prompts you each morning to review yesterday's unfinished tasks
- **Weekly review** — End-of-week summary with archive option
- **Native Mac feel** — Dark mode, traffic light positioning, minimal design
- **Plain Markdown backend** — Edit your tasks in any text editor
- **Tactile sounds** — Subtle audio feedback (toggleable)

## Getting Started

### Option 1: Download a Release

If you just want to install the app, go to [Releases](../../releases) and download:

- `Today-<version>.dmg` — recommended for most people
- `Today-<version>-mac.zip` — use this only if you specifically want the zipped app bundle instead of the installer disk image

#### Recommended install steps (`.dmg`)

1. Download the latest `Today-<version>.dmg`
2. Open the DMG
3. Drag **Today.app** into **Applications**
4. Open **Applications** and launch **Today**
5. If macOS warns that the app is from an unidentified developer, right-click **Today.app** and choose **Open**, then click **Open** again

#### If you downloaded the `.zip` instead

1. Download `Today-<version>-mac.zip`
2. Unzip it
3. Move **Today.app** into **Applications**
4. Launch it from **Applications**
5. If macOS blocks the first launch, right-click **Today.app** and choose **Open**

### Option 2: Build from Source

```bash
git clone https://github.com/thatSandemaboy/today-mac.git
cd today-mac
npm install
npm start
```

To build installable release files yourself:

```bash
npm run build
```

This creates macOS release files such as:

- `.dmg` installer
- `.zip` app archive

### First Run

On first launch, Today guides you through a quick setup:

1. **Choose a location** for your `today.md` file — pick any folder (your Obsidian vault, iCloud Drive, Dropbox, or use the default `~/.today/`)
2. **Add your first task** — or skip to start with an empty board

Your choice is saved in `~/.today/settings.json`. If the file is ever moved or deleted, setup will re-appear so you can pick a new location.

## Keyboard Shortcuts

### Navigation
| Key | Action |
|-----|--------|
| `j` / `↓` | Move down |
| `k` / `↑` | Move up |
| `h` | Promote task (move left: today → week) |
| `l` | Demote task (move right: week → today → done) |
| `1` `2` `3` | Jump to section (Today, This Week, Done) |
| `g` | Jump to Monthly Goals |

### Task Management
| Key | Action |
|-----|--------|
| `a` | Add task to current section |
| `Enter` | Edit selected task |
| `Tab` (editing) | Save text and edit notes |
| `Backspace` | Delete task |
| `Space` | Move task right (week → today → done) |
| `Shift+Space` | Move task left |
| `z` | Snooze task (hide until tomorrow) |
| `u` / `Cmd+Z` | Undo |

### Features
| Key | Action |
|-----|--------|
| `/` | Search tasks |
| `Cmd+.` | Focus mode (single-task + timer) |
| `Cmd+M` | Link mode (connect related tasks) |
| `Cmd+N` | Quick add to This Week |
| `Cmd+Shift+Space` | Quick capture (brings app to front) |
| `Cmd+Option+N` | Ghost capture (floating input from anywhere) |
| `Cmd+E` | Open markdown file in default editor |
| `Cmd+Shift+M` | Toggle Monthly Goals |
| `?` | Show all shortcuts |

## Data Storage

### Settings

App settings live at `~/.today/settings.json`:

```json
{
  "tasksFilePath": "/Users/you/Documents/today.md",
  "setupComplete": true
}
```

### Task File

Your tasks are stored as plain Markdown at the location you chose during setup:

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
| Syntax | Meaning |
|--------|---------|
| `- Task name` | Basic task |
| `- Task name 2h` | Task with time estimate |
| `- Task name 30m` | Task with time estimate (minutes) |
| `  > Note text` | Task notes (indented, on next line) |
| `  Goal: Goal name` | Linked to a monthly goal |
| `- ~~Task name~~ *time*` | Completed task with timestamp |

## Development

```bash
npm start          # Run the app
npm run build      # Package for macOS (.dmg + .zip)
npm run pack       # Unpacked build (faster, for testing)
```

### Project Structure

```
today-mac/
├── main.js        # Electron main process (settings, IPC, file I/O)
├── index.html     # Main window (UI + all renderer logic)
├── ghost.html     # Ghost capture floating window
└── package.json
```

## License

MIT

---

*Built for people who think in weeks, work in days, and ship in hours.*
