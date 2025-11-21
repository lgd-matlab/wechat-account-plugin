# OpenSpec Directory

This directory contains the OpenSpec-based specification and change management system for the WeWe RSS for Obsidian plugin.

## Structure

```
openspec/
├── README.md           # This file
├── AGENTS.md          # Conventions for AI agents
├── project.md         # Complete project specification
├── specs/             # Approved capability specifications
└── changes/           # Change proposals (active and historical)
    └── <change-id>/
        ├── proposal.md    # High-level proposal
        ├── tasks.md       # Implementation tasks
        ├── specs/         # Capability specs for this change
        │   └── <capability>/
        │       └── spec.md
        └── VALIDATION.md  # Validation report (optional)
```

## Current Changes

### Active Proposals

#### [separate-ai-settings-page](./changes/separate-ai-settings-page/)
**Status**: Validated, Ready for Implementation
**Description**: Refactor AI Summarization settings into a dedicated settings tab

- **Motivation**: Main settings tab is becoming crowded (762 lines); AI features deserve dedicated interface
- **Scope**: Create new `AISettingsTab` component, migrate settings, update documentation
- **Effort**: ~5.5 hours
- **Files**:
  - [Proposal](./changes/separate-ai-settings-page/proposal.md)
  - [Tasks](./changes/separate-ai-settings-page/tasks.md)
  - [Spec: AI Settings UI](./changes/separate-ai-settings-page/specs/ai-settings-ui/spec.md)
  - [Validation Report](./changes/separate-ai-settings-page/VALIDATION.md)

## Workflow

### For Developers

1. **Review**: Read [proposal.md](./changes/<change-id>/proposal.md) to understand the change
2. **Plan**: Follow [tasks.md](./changes/<change-id>/tasks.md) sequentially
3. **Implement**: Use [spec.md](./changes/<change-id>/specs/<capability>/spec.md) for detailed requirements
4. **Validate**: Check all scenario requirements are met
5. **Test**: Verify all testing requirements from spec.md

### For AI Agents

1. **Read**: Review [AGENTS.md](./AGENTS.md) for conventions
2. **Ground**: Examine [project.md](./project.md) and related code
3. **Scaffold**: Create proposal, tasks, and specs in `changes/<change-id>/`
4. **Specify**: Write requirements with Given/When/Then scenarios
5. **Validate**: Ensure all requirements have scenarios, tasks have dependencies

## Key Files

### [project.md](./project.md)
Complete project specification including:
- Architecture overview
- Technology stack
- Core components
- Domain model
- Current features
- Known limitations

### [AGENTS.md](./AGENTS.md)
Conventions and best practices for AI agents:
- Document structure requirements
- Requirement and scenario format
- Validation checklist
- Common patterns

## Quick Commands

```bash
# List all changes
ls -la openspec/changes/

# View a specific proposal
cat openspec/changes/<change-id>/proposal.md

# View specification
cat openspec/changes/<change-id>/specs/<capability>/spec.md

# View tasks
cat openspec/changes/<change-id>/tasks.md
```

## Creating a New Change Proposal

1. Choose a unique, verb-led change ID (e.g., `add-export-feature`)
2. Create directory structure:
   ```bash
   mkdir -p openspec/changes/<change-id>/specs/<capability>
   ```
3. Create required files:
   - `proposal.md` (motivation, scope, design decisions)
   - `tasks.md` (ordered implementation steps)
   - `specs/<capability>/spec.md` (detailed requirements)
4. Follow [AGENTS.md](./AGENTS.md) conventions
5. Validate proposal meets OpenSpec requirements

## Specification Format

Each spec MUST include:
- **ADDED Requirements**: New capabilities being introduced
- **MODIFIED Requirements**: Changes to existing capabilities
- **REMOVED Requirements**: Deprecated functionality
- **Scenarios**: Given/When/Then format for each requirement

## References

- **OpenSpec Workflow**: See `/openspec:proposal`, `/openspec:apply`, `/openspec:archive` commands
- **Project Documentation**: `CLAUDE.md` (root) and `src/*/CLAUDE.md` (modules)
- **RFC 2119 Keywords**: MUST, SHOULD, MAY for requirement levels

---

**Last Updated**: 2025-11-19
**OpenSpec Version**: 1.0.0
**Project**: WeWe RSS for Obsidian v0.1.1
