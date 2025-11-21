# OpenSpec Agent Conventions

## Overview

This document provides conventions and guidelines for AI agents working with the OpenSpec workflow in the WeWe RSS for Obsidian project.

## Document Structure

### Change Proposals

Every change proposal MUST include:

1. **proposal.md**: High-level description, motivation, scope, and design decisions
2. **tasks.md**: Ordered list of implementation tasks with dependencies
3. **specs/**: Directory containing capability specifications

### Specification Format

Each spec file MUST follow this structure:

```markdown
# Spec: [Capability Name]

## Capability
[Brief capability description]

## Overview
[Detailed capability overview]

## ADDED Requirements
[New requirements with scenarios]

## MODIFIED Requirements
[Changed requirements with scenarios]

## REMOVED Requirements
[Deprecated requirements]

## Dependencies
[Internal/external dependencies and related capabilities]

## Testing Requirements
[Unit, integration, and manual testing requirements]

## Open Questions
[Unresolved issues for discussion]

## Related Specs
[Cross-references to other specifications]
```

### Requirement Format

Each requirement MUST include:

1. **Requirement**: Clear statement of what MUST/SHOULD/MAY happen
2. **Rationale**: Explanation of why this requirement exists
3. **Scenarios**: One or more scenarios using Given/When/Then format

Example:
```markdown
### Requirement: [Requirement Name]

[Requirement statement using MUST/SHOULD/MAY]

**Rationale**: [Why this requirement exists]

#### Scenario: [Scenario description]

**Given** [preconditions]
**When** [action/trigger]
**Then** [expected outcome]
**And** [additional outcomes]
```

## Validation Requirements

Before submitting a proposal:

1. **Structural Validation**:
   - All required files exist (proposal.md, tasks.md, spec.md)
   - Directories follow naming convention: `openspec/changes/<change-id>/`
   - Spec files in `specs/<capability>/spec.md`

2. **Content Validation**:
   - All requirements have at least one scenario
   - Scenarios use Given/When/Then format
   - Dependencies are clearly stated
   - Tasks are ordered with dependencies noted

3. **Consistency Validation**:
   - Change ID is consistent across all files
   - References to related capabilities are valid
   - No conflicting requirements

## Best Practices

### Scope Management

- Keep changes tightly scoped
- Break large changes into multiple proposals
- Clearly mark what's in scope vs out of scope

### Requirements Writing

- Use RFC 2119 keywords (MUST, SHOULD, MAY) consistently
- Each requirement should test one thing
- Scenarios should be specific and testable

### Task Breakdown

- Tasks should be small and verifiable
- Include validation criteria for each task
- Note parallelization opportunities
- Estimate effort realistically

### Documentation

- Update project.md when architecture changes
- Maintain cross-references between specs
- Document open questions and assumptions

## Common Patterns

### UI Component Spec

When specifying a new UI component:

1. **Registration**: How is it registered in the plugin lifecycle?
2. **User Interactions**: What can users do?
3. **State Management**: How does state persist?
4. **Visual Consistency**: Does it match Obsidian's design?

### Service Spec

When specifying a new service:

1. **Initialization**: When and how is it created?
2. **Public API**: What methods are exposed?
3. **Dependencies**: What does it depend on?
4. **Error Handling**: How are errors managed?

### Data Model Spec

When specifying a new data model:

1. **Schema**: What fields exist and their types?
2. **Validation**: What constraints apply?
3. **Relationships**: Foreign keys and associations?
4. **Migrations**: How does existing data transform?

## Review Checklist

Before finalizing a proposal:

- [ ] Change ID is unique and descriptive
- [ ] Motivation clearly explains the problem
- [ ] Scope is well-defined (in/out of scope)
- [ ] All requirements have scenarios
- [ ] Tasks are ordered with dependencies
- [ ] Testing requirements are comprehensive
- [ ] Documentation updates are included
- [ ] No TypeScript type changes break existing code
- [ ] Backwards compatibility is considered

## Validation Commands

(Note: These commands are examples - actual validation tooling TBD)

```bash
# Validate proposal structure
openspec validate separate-ai-settings-page --strict

# Show proposal details
openspec show separate-ai-settings-page --json

# List all changes
openspec list

# List all specs
openspec list --specs
```

## References

- Root project spec: `openspec/project.md`
- Main documentation: `CLAUDE.md`
- Module documentation: `src/*/CLAUDE.md`
- RFC 2119: https://www.ietf.org/rfc/rfc2119.txt
