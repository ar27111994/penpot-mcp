## Summary

-

## Type of change

- [ ] Documentation / skill content
- [ ] Reference workflow or example
- [ ] Validation / packaging
- [ ] Metadata / release prep
- [ ] Other:

## Penpot MCP safety checklist

- [ ] I preserved inspect-first guidance (`penpot_api_info` / `high_level_overview`).
- [ ] I preserved READ -> PLAN -> WRITE -> VERIFY guidance for modifications.
- [ ] I kept write examples small and batched.
- [ ] I avoided switching pages and writing in the same `execute_code` example.
- [ ] I used structural verification instead of relying only on `export_shape`.
- [ ] I avoided unsupported Penpot MCP/plugin behavior claims.
- [ ] I kept examples generic and removed private/project-specific details.

## Validation

- [ ] `npm run validate`
- [ ] `npm run format:check`
- [ ] `npm run lint`
- [ ] `npm run check:whitespace`
- [ ] `npm pack --dry-run`

If any gate was skipped or failed, explain why:

## Notes for reviewers
