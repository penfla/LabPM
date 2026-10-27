# User guide

Applies to LabPM 1.1.0. Live demo / source: https://github.com/penfla/labpm

## 1. Navigation

Left rail: **Work** (Dashboard, Tasks, Requests) · **Planning** (Portfolio, Templates, Automations, Documents) · **System** (Session, Settings, Info & license). On screens ≤ 860 px the rail becomes a horizontal scroll bar.

Top bar: running-timer button (opens the task), theme (Light / Dark / Auto), **User** switcher (demo of roles; see §10).

## 2. Dashboard

Widgets can be toggled under *Visible widgets* (preference is saved).

| Widget | Definition |
|---|---|
| Indicators | Open tasks; overdue (due < today and not Done); blocked (any predecessor not Done); hours logged / estimated (open tasks only); projects *At risk*; instrument conflicts |
| Task status | Count per status |
| Hours per project | Grey = estimated, coloured = logged |
| 6-week workload | Per person, one bar per week from the current Monday; green ≤ 85 % of capacity, amber 85–100 %, red > 100 % |
| Deadlines within 7 days | Open tasks with due ≤ today + 7 (includes overdue) |
| Instrument conflicts | Pairs of open tasks with the same *Instrument* value (≠ *Other*) and overlapping start–due intervals |
| Project summary | Rule-based text (progress, overdue, blocked, delays blocking others, next unblocked task, hours). No generative AI |

## 3. Tasks

Toolbar: view switch, search (title + tags), filters (project, assignee, status), grouping (List only), **+ Task** (PM/Admin).

| View | Notes |
|---|---|
| List | No column sorting; optional grouping (status, project, person, priority). Custom fields appear as extra columns. Click a row to open the detail drawer |
| Board | One column per status. Drag a card to change status (blocked tasks refuse *In progress / In review / Done*) |
| Timeline | Bars = start→due on working-day grid; dark fill = logged / estimated; arrows = dependencies; red line = today |
| Calendar | Month grid, cards on due date (max 3 per day + counter) |
| Workload | Hours per person per week for 6 weeks, vs capacity |

### Task drawer

Title, project, status, assignee (PM/Admin only), priority, start, due, estimated hours, tags, custom fields, dependencies, time tracking, notes, linked documents, delete (two-step confirm).

- **Dependencies (finish-to-start).** Tick predecessors. Circular links are prevented (candidates exclude tasks that already depend on the current one).
- **Cascade.** Changing a due date or adding a predecessor moves every non-Done successor whose start ≤ predecessor due: new start = next working day after the predecessor due, duration (in working days) preserved, recursively. A toast reports how many tasks moved.
- **Time.** *Start timer* (stops any other timer you have running); stopping logs hours (≥ 0.01 h, rounded to 0.01) with note "Timer". Manual entry: hours + note → today. Last 8 entries shown.
- **Overdue flag.** Computed live; also fires *overdue* automations once per task (re-armed when dates change).

## 4. Requests (intake)

Form → creates a task in project **Internal requests** (created if missing) with status **Triage**, tag `request`, `src=form`. Delivery date is moved to the next working day and cannot be in the past. Fields mapped to custom fields when present: Instrument, No. of samples, Lot.

Triage queue: PM/Admin choose an assignee and **Accept** → status *To do*. Viewer cannot submit.

External users cannot reach the form: data is local to the browser.

## 5. Portfolio and goals

- Project status: *Auto* (Done if all tasks Done; *At risk* if any open task is overdue; else *On track*) or manual override (*On track, At risk, On hold, Done*).
- Progress = Σ estimated hours of Done tasks / Σ estimated hours (tasks with 0 h count as 1).
- Goal progress = mean progress of linked projects; flagged *past due* when target < today and < 100 %.
- *Notes* opens (or creates) the project's note document.

## 6. Templates

| Template | Tasks | Standards |
|---|---|---|
| DSC characterization | 5 | ASTM D3418, ISO 11357-3 |
| Compound extrusion campaign | 6 | ISO 1133-1 (MFR) |
| PE/EVOH/PE multilayer film | 6 | ASTM D3985 (OTR), ISO 527-3 (tensile) |
| Instrument calibration and verification | 4 | – |
| Analytical method validation | 5 | – |

*Use template* → name + start date → creates a project with dependent tasks scheduled forward on working days (each task starts after its latest predecessor), jumps to Tasks → Timeline. Estimated hours and *Instrument* values are pre-filled; assignees are not.

Standards: https://www.astm.org · https://www.iso.org. Templates only cite the standard number; verify method parameters against the current edition.

### Bulk task entry

Templates → *Create tasks from a list*, one task per line:

```
Weigh samples @Bianchi #1 ~3h
FTIR on 8 films @Neri #2 ~6h
```

| Token | Meaning | Default |
|---|---|---|
| `@name` | Assignee: first user whose name contains the text (case-insensitive) | unassigned |
| `#N` | Duration in working days | 2 |
| `~Nh` | Estimated hours (`~1.5h` or `~1,5h`) | 0 |

Tokens are removed from the title. Tasks start today (next working day if weekend).

## 7. Automations

Rule = **When** (trigger) · optional **Condition** · **Action**.

| Trigger | Value |
|---|---|
| status becomes… | a status |
| a task is created | – |
| a task is overdue | – (evaluated at load and every 60 s) |

| Condition | |
|---|---|
| project is… / priority is… / has the tag… | single value; none = always |

| Action | Value |
|---|---|
| notify | text (toast) |
| assign to | person |
| set priority / set status | enum |
| add tag | text |
| create a task | title (same project and assignee, starts next working day, 3 working days) |

Chains stop at depth 3. Seeded examples: *Sample archive* (Done + tag `to-archive` → create "Archive residual samples"), *Flag overdue tasks* (overdue → tag `overdue`), *New requests to triage* (created in Internal requests → status Triage). Rule-driven status changes bypass the dependency block.

Only PM/Admin can create, toggle or remove rules.

## 8. Documents

Markdown-lite: `# / ## / ###` headings, `- ` lists, `**bold**`, `` `code` ``, bare `http(s)` links. Linked to a project and optionally a task (a task link overrides the project). Preview is live. Viewer is read-only.

## 9. Settings

- **Users and roles**, weekly capacity (h/week) — Admin only.
- **Custom fields** — PM/Admin. Types: text, number, select (comma-separated options), date, checkbox, formula.
  - Formula: `+ − × ÷`, parentheses, decimals; variables `{est}`, `{logged}`, and the name of any *number* field, e.g. `{est}/{No. of samples}`. Missing/non-numeric input → `—`.
  - The fields named *Instrument*, *No. of samples*, *Lot* are used by conflicts, workload views and the intake form; renaming or deleting them disables those features.
- **Integrations and backup** — *Copy ICS calendar* (all-day VEVENT on due date, open tasks), *Copy JSON backup*, *Import from field*, *Restore sample data*.
- **Activity log** — last 40 of 300 events.

## 10. Roles

| Capability | Admin | Project manager | Researcher | Viewer |
|---|:-:|:-:|:-:|:-:|
| View everything | ✓ | ✓ | ✓ | ✓ |
| Create / delete tasks, change assignee | ✓ | ✓ | – | – |
| Edit task fields, timer, hours | ✓ | ✓ | own tasks | – |
| Projects, goals, templates, bulk entry, fields, rules | ✓ | ✓ | – | – |
| Accept requests | ✓ | ✓ | – | – |
| Submit requests | ✓ | ✓ | ✓ | – |
| Edit documents | ✓ | ✓ | ✓ | – |
| Users & roles, import, restore snapshot, open file, reset | ✓ | – | – | – |

Roles are a UI convention (see [SECURITY.md](../SECURITY.md)).

## 11. Sessions and backup

| Action | Where | Notes |
|---|---|---|
| Autosave | automatic | `localStorage`; message in the rail footer |
| Save in browser | Session | Named snapshot, max 12 (oldest dropped); includes `ui` state but not running timers |
| Save to file | Session | `labpm-session-YYYY-MM-DD.json` download |
| Restore snapshot / open file | Session | Admin; two-step confirm; automatic snapshot first; ≤ 5 MB |
| Copy / paste JSON | Session, Settings | Clipboard fallback writes into the text field |

## 12. Keyboard and accessibility

`Esc` closes the drawer. Focus rings on all controls; status is always text + colour; `prefers-reduced-motion` respected; light/dark follow the system in *Auto*.

---
© Flavio Pendolino, 2026. This document is distributed under the CC BY-NC 4.0 license (https://creativecommons.org/licenses/by-nc/4.0).
