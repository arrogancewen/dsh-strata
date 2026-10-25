# Strata · Layered Memory for DSH

[简体中文](README.md) | **English**

Strata is a local memory plugin for DeepSeek Harness (DSH). Version **0.1.3** provides versioned memory, scoped recall, evidence retrieval, portable import/export, and a settings panel that follows DSH's default colors and light/dark theme. The current settings interface is in Chinese.

## Features

| Feature | Current behavior |
| --- | --- |
| Memory records | Save observations, claims, decisions, tasks, ideas, outcomes, and rule drafts. |
| Search | Local lexical search with Chinese tokenization, pagination, and historical views. |
| Session scope | Allow the whole DSH instance or sessions in one folder, optionally including subfolders. |
| Migration | Export complete or reference-only JSON bundles; import Strata JSON, Markdown, and TXT with a preview and explicit confirmation. |
| Original evidence | Read archived source text in pages and verify its content hash. |
| Manual idea inbox | Save and inspect ideas separately from default factual recall. |
| Settings | Browse, search, save, configure scope, import/export, and inspect original evidence. |

## Install in DSH Desktop

Requirements:

- Node.js **22.13 or newer** for local development and the standalone settings server.
- DSH SDK **0.2.1-rc.2** is the verified integration target. Later runtime versions have not been verified.

Clone and build:

```sh
git clone https://github.com/arrogancewen/dsh-strata.git
cd dsh-strata
npm ci
npm run build
```

In DSH Desktop, open **Plugins**, install the local `dsh-strata` directory, and enable it. Follow any reload instructions shown by DSH. Then open **Settings → 记忆地层**.

The storage and migration core has no external runtime dependencies. `esbuild` is a development dependency used to build the DSH client module. The source installation above does not require a published npm package.

For a Web profile, install the built directory using its absolute path:

```sh
dsh plugin --profile web add /absolute/path/to/dsh-strata
```

Restart that Web instance afterward. Desktop and Web have different plugin management flows; the Web command does not replace the Desktop installation steps.

## How the features work

### Saving and retrieving memory

```text
Save a record
    ↓
Commit an immutable revision and update the current HEAD
    ↓
L0: a small, scoped list of memory hints in the agent context
    ↓
recall: find bounded summaries
    ↓
zoom: read one complete memory record
    ↓
deep: read its archived original evidence, when available
```

Use **记下一条** in settings to create a record, or ask the DSH assistant to remember something through the available tools.

| Tool | Purpose |
| --- | --- |
| `strata_remember` | Save a titled memory with a body, record kind, and optional links to existing parent records. |
| `strata_recall` | Search authorized memories and return summaries, IDs, revisions, and a stable `viewId`. |
| `strata_zoom` | Read a complete record using its ID, with optional historical view and exact revision. |
| `strata_deep` | Read original evidence attached to a record, with pagination and hash verification. |

Each recall summary contains at most **1,200 JavaScript string code units**. The returned summary items have an aggregate JSON budget of **16,000 UTF-8 bytes**. Use `nextOffset` with the same `viewId` to continue a search, then pass the record's `revision` to zoom or deep when selecting an exact version.

Deep returns up to 8,000 string code units by default, with a maximum of 20,000 per page. Its `nextCursor` continues the archived text. A saved memory body is not automatically original conversation evidence: when evidence is absent, deep returns `source_unavailable`.

The L0 index labels memory as historical material rather than current instructions. It includes record kinds and epistemic states. Its current size limit is conservative and byte-based; it is not an exact model tokenizer budget.

### Scope and authorization

The **使用范围** page offers two modes:

- **整个 DSH**: sessions connected to the same memory library can use it.
- **指定文件夹**: only sessions whose working directory is the selected folder can use it; the subfolder option extends this to descendants.

The host supplies the live session identity and working directory. Model arguments cannot grant administrative access or replace that directory. Directory checks resolve physical paths and compare directory boundaries, including junctions and links.

Reads check the current library policy together with record, evidence, and parent-record restrictions. Historical access remains subject to current authorization. A normal session cannot widen an existing record's scope or remove its derivation links. New derived records inherit the narrowest compatible scope of their sources; later restrictions on a parent also constrain its descendants. Missing or invalid derivation chains are unavailable to normal session recall while administrators can inspect them.

The owner settings panel manages the whole library. Administrative visibility does not grant the same access to session tools.

### Versions, evidence, and trust

The authoritative store consists of immutable JSON snapshots under `.history/commits`. An atomically updated `HEAD.json` selects the current commit. A file lock serializes writers from different processes, and expected revisions prevent updates from silently overwriting concurrent changes.

`memories/*.md` files are readable projections of the current records. Editing those files directly does not update the authoritative store.

Record revisions and archived evidence retain hashes and source pointers. Hash verification proves content integrity, not the truth of a statement. Importing a record never grants it a supported status; an imported supported status is downgraded to unverified.

Ideas and rule drafts are excluded from default factual recall. They can be queried explicitly by kind. Tracked descendants of ideas and drafts remain candidates unless an explicit confirmation path is used; ordinary assistant updates cannot promote them by changing their record kind.

### Migration and import

Open **迁移与导入** and follow this flow:

1. Select a Strata v1 JSON bundle, `.md`, `.markdown`, or `.txt` file.
2. Choose **merge** or **independent copy**, then choose the target scope.
3. Click **校验并预览** to review added, updated, skipped, and conflicting records, plus the source and target scopes. Preview does not write memory.
4. Click **确认导入** to commit the planned changes atomically.

Preview checks the package checksum, record revisions, linear version chains, evidence references, and target folder. A preview expires after ten minutes. If the library changes after preview, create a fresh preview before confirming.

**Merge** matches source identities, skips known versions, and appends compatible source updates. Divergent local edits block the import instead of being overwritten. **Independent copy** creates separate local record identities and provides a way to retain both branches.

Folder-restricted material requires a local folder binding and cannot be silently imported as globally available. Mapping folders does not change the library-wide policy. When multiple source folder restrictions are mapped into one target folder, the preview asks for an explicit choice and reports the mapping.

| Export mode | Contents and behavior |
| --- | --- |
| Complete | Current and historical record versions plus their available referenced original evidence. Export fails if required evidence is already missing. |
| Reference | Record versions and source references without archived evidence. Original-text retrieval can remain unavailable. |

A later merge of a complete bundle from the same source can fill evidence omitted by an earlier reference import. Unavailable external IDs are isolated from unrelated local records and evidence. Reference import does not fetch content from another machine or a network service.

Markdown and TXT import save the whole file as one unverified claim and preserve its text as evidence. Text inside an imported document is stored as data; it is not executed as instructions. Unchanged material does not create duplicate records when merged again. If its original date is unknown, the interface displays **来源时间未知**.

## Standalone settings interface

From the repository directory:

```sh
npm start
```

Open the printed address, normally `http://127.0.0.1:4318`. This uses the same core and settings interface as the DSH plugin. It creates a separate library under `.local/memory`, initially restricted to the project directory. It does not automatically import existing sessions or alter DSH's configuration.

To manage the same library as the installed plugin, explicitly point `--root` to that library. For example, in PowerShell:

```powershell
node src/server.mjs --root "$env:USERPROFILE\.dsh\strata" --cwd (Get-Location).Path --port 4318
```

The local server listens only on `127.0.0.1`. Its API requires a per-process page token and checks request Host and Origin. Use `Ctrl+C` to stop a foreground server.

## Data location and configuration

The installed plugin defaults to `~/.dsh/strata` (`%USERPROFILE%\.dsh\strata` on Windows). A newly created plugin library initially allows the whole DSH instance; change this on the scope settings page. Reopening an existing library preserves its saved policy.

To use another location, add the plugin's `root` configuration to the corresponding profile patch. Replace the example with an existing or desired absolute local path:

```yaml
- id: dsh-strata
  config:
    root: '/absolute/path/to/strata-memory'
```

Cloud placeholder directories are rejected for automatic access. The plugin does not scan the user's home directory to discover or import memories.

## Current limits

- JSON migration packages: **12 MiB**, up to **10,000 record versions** and **10,000 evidence items**.
- Text import: **512 KiB** and at most **262,144 JavaScript string code units**.
- Storage uses whole-state snapshots with a **64 MiB** per-state limit. Large-library performance has not been validated.
- Search is local and lexical; no vector model or SQLite FTS index is used.
- DSH session ZIP archives, arbitrary legacy databases, and persona/role-card files are not direct import formats. Export legacy notes as Markdown or TXT first.
- Automatic conversation capture, working-state replay after compaction, automatic insight delivery, personas, role cards, semantic conflict detection, and experience distillation are not implemented. The idea inbox is manual, and automatic settings stay disabled.
- Imported history uses target-library commit positions while preserving source identities and versions. Source-library view IDs do not select history in the destination library.

## Development and verification

```sh
npm ci
npm run check
npm test
npm run build
npm run test:dsh
npm run test:browser
npm run pack:check
```

Core, application, HTTP, and migration tests use temporary libraries. They cover concurrent writes, historical authorization, provenance, deduplication, conflicts, folder mapping, reference completion, and failed-transaction rollback.

`test:dsh` runs an isolated integration with a locally installed DSH SDK. It reports **SKIP** when that SDK is unavailable. Set `DSH_SDK_ROOT` or pass an SDK `node_modules` directory explicitly:

```sh
node scripts/verify-local-dsh.mjs /absolute/path/to/dsh/node_modules
```

This test uses the actual HostConnectionService registration and HTTP/RPC envelope with simulated owner admission. Client module registration is a structural check; it does not claim to render the complete Desktop application.

`test:browser` uses Chrome to exercise the standalone interface with a temporary library, including real file upload/download, pagination, evidence paging, safe text rendering, narrow layouts, and dark mode. Set `CHROME_PATH` if Chrome is installed elsewhere. Reports and screenshots are written under `.artifacts` and test records are removed afterward.

```text
src/core/           Storage, versions, scope, lexical search, evidence
src/transfer.mjs    Migration validation, preview plans, atomic import
src/application.mjs Shared application interface and authorization
src/host/           DSH Cordis, RPC, tools, and L0 integration
src/server.mjs      Local settings server
client/             Settings UI and DSH client entry
lib/client.js       Built DSH ModuleLoader client
tests/              Automated tests
```

## License

The package is currently marked **UNLICENSED**. No open-source license has been granted in this repository.
