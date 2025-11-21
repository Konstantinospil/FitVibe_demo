---
name: docs
description: Update documentation based on code changes
invokable: true
---

Update relevant documentation based on code changes. Follow FitVibe documentation standards and maintain traceability.

## When to Update Documentation

1. **Product Changes (UX/Features)**
   - Update PRD: `docs/1.Product_Requirements/1.Product_Requirements_Document.md`
   - Update user flows: `docs/3.Sensory_Design_System/3.c.User_Flow_Documentation.md`
   - Update RTM (Requirements Traceability Matrix)

2. **Technical Changes**
   - Update TDD: `docs/2.Technical_Design_Document/`
   - Update API design: `docs/2.Technical_Design_Document/2d.Technical_Design_Document_APIDesign.md`
   - Update data design: `docs/2.Technical_Design_Document/2c.Technical_Design_Document_Data.md`
   - Update modules: `docs/2.Technical_Design_Document/2b.Technical_Design_Document_Modules.md`

3. **Architecture Decisions**
   - Create/update ADR: `docs/2.Technical_Design_Document/2.f.Architectural_Decision_Documentation/`
   - Follow ADR template: `ADR_TEMPLATE.md`
   - Update ADR index: `ADR_INDEX.md`

4. **Infrastructure Changes**
   - Update: `infra/README.md`
   - Update security policies: `infra/security/policies/`
   - Update observability configs if needed

5. **Documentation Standards**
   - Use conventional commit messages
   - Link to related sections
   - Keep diagrams updated (Mermaid)
   - Update glossary if new terms added

6. **Code Comments**
   - Add JSDoc for public APIs
   - Document complex logic
   - Explain "why" not just "what"
   - Include parameter and return type documentation

## Documentation Standards

### Commit Messages
- Use conventional commits (`feat:`, `fix:`, `docs:`, `chore:`)
- Link to related PRD/TDD sections when applicable
- Reference ADRs for architectural decisions

### Linking
- Link to related sections in PRD/TDD
- Update RTM (Requirements Traceability Matrix) when requirements change
- Cross-reference related ADRs

### Diagrams
- Keep Mermaid diagrams updated
- Use consistent diagram styles
- Update ERD when schema changes

### Glossary
- Add new terms to `docs/0.Glossary.md`
- Define acronyms and domain-specific terms
- Keep definitions accurate and up-to-date

## Quick Reference

- **PRD**: `docs/1.Product_Requirements/1.Product_Requirements_Document.md`
- **TDD**: `docs/2.Technical_Design_Document/`
- **ADRs**: `docs/2.Technical_Design_Document/2.f.Architectural_Decision_Documentation/`
- **Glossary**: `docs/0.Glossary.md`
- **RTM**: `docs/1.Product_Requirements/rtm_comprehensive.csv`

