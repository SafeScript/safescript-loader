# Changelog

## [1.2.0] — 2026-10-25

### Changed
- Bumped version to 1.2.0.
- Updated `peerDependency` to `safescript >=1.2.0`.
- The loader runs in the browser where scripts loaded via `<script type="safescript">` tags benefit from v1.2's DOM safety layer. A future release may auto-provide a safe document facade for loaded scripts.
