# Start Here — the beginner's guide

No experience assumed. This walks you from "I have a link" to "I changed something and
it's live on the internet." If you've built websites before, skip to `HANDOFF.md`.

---

## What this project actually is

A website. That's it. It's made of the same three things every website is made of:

- **HTML** files — the pages (`index.html`)
- **CSS** — the styling (inside the HTML files here)
- **JavaScript** files — the code that makes the games run (the `js/` folders)

There's no database, no login system, no server code, no "framework." Nothing gets
installed or compiled. The files you see are exactly what runs in the browser. If you
change a file and reload the page, you see the change.

---

## ⚠️ One thing that will confuse you if nobody warns you

**Do not just double-click `index.html` to open it.**

The menu page will open, but when you click into a game you'll get a black screen. It
looks broken. It isn't.

Modern browsers refuse to let a page loaded straight from your hard drive load extra
code files — a security rule. The games need that, so they need to be served by a
"local web server" instead. That sounds intimidating; it's one click or one command.
Options below.

---

## Path A — See it live with zero installs (easiest, start here)

You don't need to download anything to get your own working copy on the internet.

1. Go to the repo page and click **Fork** (top-right). This makes your own copy under
   your account.
2. In *your* fork, click the **Settings** tab.
3. In the left sidebar, click **Pages**.
4. Under "Source", choose **GitHub Actions** from the dropdown.
5. Wait about a minute. Refresh the page — a link appears at the top:
   `https://your-username.github.io/ronin-arcade/`

That's your live site. Nobody else controls it. Every time you change a file (see Path
B), it republishes itself automatically in about a minute.

**Bonus: you can edit without installing anything.** In your fork, click any file, then
the pencil ✏️ icon, make a change, scroll down, click **Commit changes**. Wait a minute,
reload your site. Done. This is a fine way to fix text, captions, or numbers.

---

## Path B — Work on it properly on your computer

### Step 1: Get the tools (one time, ~5 minutes)

1. **A code editor** — install [VS Code](https://code.visualstudio.com). It's free.
2. **Git** — install from [git-scm.com](https://git-scm.com/downloads). Click through
   the installer with the default options. This is what downloads and saves code.

### Step 2: Get the code onto your computer

Open VS Code. Press `Ctrl+Shift+P` (Mac: `Cmd+Shift+P`), type `git clone`, press Enter,
then paste the repo address:

```
https://github.com/noelmrodriguez-no3lito/ronin-arcade.git
```

Pick a folder (Desktop is fine). When it asks "Would you like to open the cloned
repository?", click **Open**.

### Step 3: Run it (the no-terminal way)

1. In VS Code, click the **Extensions** icon in the left bar (four squares).
2. Search for **Live Server**, click **Install**.
3. Right-click `index.html` in the file list → **Open with Live Server**.

Your browser opens with the arcade running. Leave it open — when you save a file, the
page reloads by itself.

*(Prefer a terminal? In the project folder run `npx serve .` and open the address it
prints. Needs [Node.js](https://nodejs.org) installed. Same result.)*

### Step 4: Change something

Open `comic/index.html`, find any line of story text, change a word, hit save. Look at
your browser — it's already different. That's the whole loop.

### Step 5: Save your work back to GitHub

In VS Code's left bar, click the **Source Control** icon (the branching lines). You'll
see your changed files.

1. Type a short note in the message box (e.g. "fixed a typo in the comic")
2. Click **Commit**
3. Click **Sync Changes** (or "Push")

If you set up Path A, your live site updates by itself a minute later.

---

## Where to change what

Nothing here is hidden or generated — every file is editable text.

| I want to change... | Open this |
|---|---|
| The main menu / title / doors | `index.html` |
| The comic's words | `comic/index.html` (the text is right there in plain English) |
| The comic's pictures | swap files in `comic/assets/` |
| How hard the horde game is | `swarm/js/game.js` — look for `BASE` (your stats) and `threat()` (difficulty) |
| How fast the runner speeds up | `run/js/game.js` — search for `P.spd` |
| Clothing/weapon options in the builder | `forge/js/forge.js` — the list near the top |
| Any picture | find it in that game's `assets/` folder and replace it |

Start with the comic text — it's the easiest, safest first change and you'll see it
work immediately.

---

## Rules of thumb so you don't get stuck

- **Change one thing, then look.** Don't make ten edits before testing.
- **Everything is recoverable.** Git remembers every version. If you wreck something,
  in VS Code's Source Control panel right-click the file → **Discard Changes** to put
  it back exactly as it was.
- **Black screen after a change?** Press `F12` in the browser and read the **Console**
  tab. The red message names the file and line number that broke. Usually it's a typo
  like a missing comma or quote.
- **A picture didn't show up?** The filename must match *exactly*, capital letters
  included. `Hero.webp` and `hero.webp` are different files to a web server.
- **Nothing you do here can break the original.** You're working on your own copy.

---

## What to read next

- **`README.md`** — a one-page tour of what's in the project.
- **`HANDOFF.md`** — the deeper technical explanation: how the animation and
  character-layer systems work, the story rules for new content, how the artwork was
  made, and per-game notes. Read it once you've made your first change and want to
  build something real.
