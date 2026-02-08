# Phase 2 Migration: Architecture Alignment

## Overview

**Goal:** Align the implemented Phase 2 storage components with the `ARCHITECTURE.md` direction.
**Primary Shift:** Move from a **File-Based Tool System** (scanning `.tools/` in OPFS) to a **Registry-Based Tool System** (loading objects from IndexedDB).

## 1. Component Renaming & Scoping

### FileStore -> RepoStore
**Current State:** `FileStore` handles generic file operations and GitHub loading.
**Target State:** `RepoStore` (conceptually).
- **Action:** Rename `FileStore` class to `RepoStore` (or aliased export) to match architecture.
- **Scope:** Strictly for project source code in OPFS (`/repos/{owner}_{repo}/`).
- **Changes:**
  - Remove generic "file management" naming where possible.
  - Ensure it provides access to project files for the Agent.

## 2. Tool Store Refactoring (Major)

**Current State:**
- Scans `.tools/` directories in OPFS.
- Parses `SKILL.md` on demand.
- `createTool` writes files to OPFS.

**Target State:**
- **Source of Truth:** IndexedDB `tools` store.
- **Startup:** Hydrates in-memory `registry` from IndexedDB.
- **Creation:** `createTool` saves JSON object to IndexedDB.
- **Import:** New utility to parse `SKILL.md` and *import* it into the Registry (one-time operation).

**Implementation Plan:**
1.  **Update `ToolDefinition` Schema:** Match `ARCHITECTURE.md` (include `func` string, `schema` object).
2.  **Rewrite `initialize()`:** Load from DB, not `scanAllRepos()`.
3.  **Rewrite `registerTool(tool)`:** Save to DB + Update Memory.
4.  **Rewrite `approveTool(id)`:** Move from `pending_tools` -> `tools` (DB).
5.  **Remove:** `scanTools`, `_loadToolFromDirectory`, directory watching logic.

## 3. Session Store Updates

**Current State:** Stores sessions and nodes.
**Target State:** Ensure compatibility with Registry IDs.
- **Check:** Ensure `toolCalls` in nodes reference `toolId` or `toolName` consistently with the Registry.

## 4. Event Alignment

Ensure the following events are used:
- `tool:pending` (Request approval)
- `tool:approved` (Moved to registry)
- `tool:loaded` (Registry hydrated)

## Execution Checklist

- [x] **RepoStore**: Rename/Alias `FileStore` to `RepoStore`.
- [x] **ToolStore**: Refactor to use IndexedDB as primary storage.
- [ ] **ToolStore**: Implement `importSkill(content)` for backward compatibility/importing. (Deferred)
- [x] **Tests**: Update `tool-store.spec.html` to test DB interactions instead of File interactions.
- [x] **Integration**: Verify `tool-approval-flow` works with new DB-based registry.
