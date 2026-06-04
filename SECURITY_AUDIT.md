# Geek-Collab Security Audit

**Scope:** Static read-only review of the Geek-Collab React Native / Expo + Firebase Firestore forum app.
**Constraint:** Harden in place — **no Firebase Auth migration**. Findings are tagged by what is achievable under that constraint.
**Date:** 2026-06-04
**Auditor role:** Scanner (read-only — no source files modified).

> Note on tooling: `npm audit` could not run normally (no `node_modules` installed; no `timeout` binary). It was run in `--package-lock-only` mode against `package-lock.json` and the results are included (Finding D-1). The shared task-board tools (TaskGet/TaskUpdate) were not present in this environment, so Task #1 status could not be set programmatically — this is noted for the orchestrator.

> Note on Firebase config: the `EXPO_PUBLIC_FIREBASE_*` values are intentionally public in a client app and are **not** treated as a vulnerability here.

---

## Summary of findings (ordered by severity)

| # | Severity | File : area | Issue | Status under scope |
|---|----------|-------------|-------|--------------------|
| 1 | **Critical** | No `firestore.rules` / `storage.rules` anywhere; `firebase.json` has no `firestore`/`storage` block | Every Firestore collection is world-readable **and** world-writable. Any client can read all users (with passwords) and wipe/replace all data. | **Fixable now** (deploy rules) |
| 2 | **Critical** | `Models.js`, `StorageExtension.saveRemoteUsers`, `AuthViewModel.signUp/login` | Passwords stored in **plaintext** in Firestore `users` and in AsyncStorage; login is a client-side `find(u => u.password === input)` string compare. | **Mitigatable** (hash client-side; full fix needs server) |
| 3 | **Critical** | `DiscussionViewModel.js:20-29, 361, 379` | Admin role granted by hardcoded **username allowlist** (`ADMIN_IDS`) checked in client code. Registration is open and username-based, so anyone can register e.g. `paul`/`joel` and become admin. | **Mitigatable** (no real fix without server auth) |
| 4 | **Critical** | `StorageExtension.saveRemoteUsers` / `syncRemoteForumCollection` / `clearForumState` / `deleteAllUsers` | Full-collection overwrite + delete-by-diff sync. Combined with #1, any unauthenticated client can delete or replace the entire `users`, `forums`, and `discussions` collections. | **Mitigatable** (rules limit blast radius; pattern still risky) |
| 5 | **High** | `DiscussionViewModel.js` (all `canModerate`/`isAdmin` gates), `StorageExtension.updateUserBanStatus/MuteStatus/Role` | All authorization (ban, mute, role change, moderation, content deletion) enforced **only in client code**. Trivially bypassed via console or direct Firestore write. | **Deferred — needs server auth** (partially mitigatable via rules) |
| 6 | **High** | `DiscussionDetailView.js:199`, `NewDiscussionView.js:160` | Web XSS: `react-native-markdown-display` renders user markdown with no link/image href sanitizer. `javascript:` / `data:` URLs in links/images are not blocked on web. | **Fixable now** (add `onLinkPress` + render rules) |
| 7 | **High** | `StorageExtension.getRemoteUsers/getAllUsers/getForumState/getRemoteForumCollection` | Unbounded full-collection `getDocs` reads on every load. With #1 this leaks **all** user records (incl. passwords) and enables DoS / cost-amplification by inflating collections. | **Mitigatable** (rules + pagination) |
| 8 | **Medium** | `NewDiscussionView.js`, `DiscussionViewModel.js` | Input validation gaps: no max length on title/content/tags/bio; `videoURL` not scheme-validated; moderation is profanity-only and bypassable (it sanitizes, does not block storage). | **Fixable now** |
| 9 | **Medium** | `package-lock.json` (see D-1) | Dependency CVEs: 34 advisories — 1 critical (`protobufjs`), 14 high (`lodash`, `tar`, `@xmldom/xmldom`, expo CLI chain), 18 moderate, 1 low. Mostly build/tooling, but `lodash` and `markdown-it`/`react-native-markdown-display` reach runtime. | **Fixable now** (upgrade) |
| 10 | **Low** | `StorageExtension.js` AsyncStorage | Plaintext user records (incl. passwords) cached unencrypted in AsyncStorage on every device that loads the app. | **Mitigatable** |

---

## Per-finding detail

### 1 — Critical — No Firestore/Storage security rules (world read/write)
There is no `firestore.rules` or `storage.rules` file anywhere in the repo, and `firebase.json` defines only `hosting` (no `firestore` or `storage` block). With default open/test rules, every collection — `users` (containing plaintext passwords), `forums`, `discussions`, `forumMeta`, legacy `appState` — is readable and writable by any anonymous client that knows the (public) project ID.
**Fix (now):** Author `firestore.rules`, register it in `firebase.json` under a `firestore` block, and deploy. Since there is no Firebase Auth, rules can't key off `request.auth`, but they can still: deny all reads of the `users` collection (it should never be client-readable once login moves server-side, or at minimum strip the password field), enforce document shape/size limits, reject documents whose `id` doesn't match, and rate-shape writes. This is the single highest-leverage fix and is fully achievable in place.
**Status:** Fixable now.

### 2 — Critical — Plaintext passwords + client-side password comparison
`Models.createUser` stores `password` as a plaintext field. `StorageExtension.saveRemoteUsers` writes the full user object (`...user`) — including `password` — to Firestore. `AuthViewModel.signUp` passes the raw password; `getUser` (`StorageExtension.js:189-194`) authenticates via `users.find(u => ... && u.password === password)` — a client-side plaintext compare against records pulled from a world-readable collection. Anyone reading the `users` collection harvests every credential.
**Fix:** Full fix requires server-side auth (out of scope). In-place mitigation: hash passwords client-side (e.g. bcrypt/scrypt/argon2 via a RN-compatible lib) before storing, store only the hash + per-user salt, and never write the plaintext to Firestore or AsyncStorage. Combine with Finding #1 to stop the `users` collection being readable at all.
**Status:** Mitigatable (true fix is deferred — needs server auth).

### 3 — Critical — Admin role via hardcoded client-side username allowlist
`DiscussionViewModel.js:20-29` hardcodes `ADMIN_IDS = ['Varun','ekansh_mishra','si_yuan','zwe','paul','joel','julianteh','rogeryeo']`. `isAdmin` is computed as `ADMIN_IDS.includes(username.toLowerCase())` (lines 361, 379) entirely in client code. Registration (`AuthViewModel.signUp`) is open and only checks username availability — but if one of these usernames is ever free, registering it grants admin. More broadly, because the check is client-side, any user can flip `isAdmin`/`canModerate` to `true` in the running JS and perform every privileged action (writes succeed because of #1/#5).
**Fix:** Real fix needs server-enforced identity (deferred). In-place mitigation: move privilege off the username string, and ensure the admin usernames are reserved/cannot be registered. Recognize this is cosmetic without server-side enforcement.
**Status:** Mitigatable (no robust fix without server auth).

### 4 — Critical — Full-collection overwrite/delete sync
`saveRemoteUsers` (StorageExtension.js:47-73) and `syncRemoteForumCollection` (80-98) read the entire collection, delete every doc whose id is not in the client's in-memory list, then overwrite the rest. `clearForumState` (475-510) and `deleteAllUsers` (321-343) delete entire collections. Any client holding a stale or malicious user list can delete other users' accounts and all discussions in one save. With #1 removing the rules barrier, this is a one-call data-wipe primitive available to anyone.
**Fix:** Firestore rules (#1) constrain who/what can be deleted and enforce that a write only touches the caller's own document. The destructive delete-by-diff sync pattern should be replaced with targeted per-document writes; flag for the fixer.
**Status:** Mitigatable (rules reduce blast radius; pattern itself should be reworked).

### 5 — High — Authorization enforced only in client code
Every privileged operation in `DiscussionViewModel.js` is gated by `if (!permissions.canModerate) return;` / `if (!permissions.isAdmin) return;` (lines 656, 692, 727, 753, 783, 808, 837, 869, 898...) and ban/mute/role mutations live in `StorageExtension.updateUserBanStatus / updateUserMuteStatus / updateUserRole`. None of this is enforced server-side. A user can call the underlying Firestore writes directly (or edit client state) to ban/mute others, self-promote, or delete content.
**Fix:** Authoritative enforcement requires server-side identity (deferred). Firestore rules can partially constrain the shape and target of writes (e.g. a user may only modify their own user doc; `isBanned`/`role` fields locked from client writes), which mitigates the worst cases without Auth.
**Status:** Deferred — needs server auth (partial mitigation via rules).

### 6 — High — Web XSS via markdown link/image hrefs
`DiscussionDetailView.js:199` and `NewDiscussionView.js:160` render user-supplied `content` through `<Markdown>` from `react-native-markdown-display` with **no** `onLinkPress` handler and **no** custom `rules`. On web (the app deploys to Firebase Hosting), markdown links and images become real anchors/`img` tags; `[x](javascript:alert(1))` and `data:` URIs are not filtered, enabling script execution on link click / phishing in another user's browser. (On web this is click-dependent — a `javascript:` link fires via `Linking.openURL` on tap — rather than zero-click stored XSS; still High.)
**Fix (now):** Add an `onLinkPress` callback that validates the scheme and returns `false` for anything other than `http:`/`https:`/`mailto:`, and override the `image`/`link` render rules to drop `javascript:`/`data:` hrefs. Apply to both the detail view and the preview.
**Status:** Fixable now.

### 7 — High — Unbounded full-collection reads (data exposure + DoS/cost)
`getRemoteUsers` / `getAllUsers` (StorageExtension.js:30-45, 137-163), `getRemoteForumCollection`, and `getForumState` issue `getDocs(collection(...))` with no limit/pagination on every load and cache the result to AsyncStorage. Combined with #1 this dumps the full `users` collection (with passwords) to any client. It also allows an attacker to inflate collections to drive read costs and slow every client.
**Fix:** Enforce read restrictions in rules (#1), paginate/limit reads, and stop pulling the full `users` collection to the client at all once auth is reworked.
**Status:** Mitigatable.

### 8 — Medium — Input validation gaps
`NewDiscussionView.js` gates submit only on non-empty trimmed `title`/`content` and a profanity check; there are no maximum-length bounds on title, content, tags, or profile `bio`, so oversized documents can be written (cost/DoS, and large base64 images). `videoURL` (Models / discussion creation) is not scheme-validated, so a `javascript:`/`data:` URL could be stored and later rendered. Moderation (`ContentModeration.moderateText`) only masks profanity in a copy — it does not block submission, and it is client-side so it is bypassable.
**Fix (now):** Add server-side-shaped length caps in rules plus client validation; validate `videoURL` against an `https?:` allowlist; treat moderation as advisory, not a control.
**Status:** Fixable now.

### 9 — Medium — Dependency CVEs (`npm audit`)
Run in `--package-lock-only` mode (no installed tree). Totals: **34** advisories — **1 critical, 14 high, 18 moderate, 1 low**. Notable:
- **critical** `protobufjs` — arbitrary code execution / code injection through byte length.
- **high** `lodash` — code injection via `_.template`; **`tar`** — arbitrary file create/overwrite via hardlink traversal; **`@xmldom/xmldom`** — XML injection; the `@expo/cli`/`@expo/config*`/`expo`/`expo-asset`/`cacache` build chain.
- **moderate** `markdown-it` (uncontrolled resource consumption) and `react-native-markdown-display` — these reach runtime and compound Finding #6; also `postcss` (XSS via unescaped `</style>`), `fast-xml-parser`, `ws`, `uuid`, `react-native`.
- **low** `send` — template-injection XSS.
Most high/critical entries are in build/CLI tooling, but `lodash`, `markdown-it`/`react-native-markdown-display`, and `uuid` are runtime-reachable.
**Fix (now):** `npm audit fix` where non-breaking; manually bump `react-native-markdown-display`/`markdown-it`, `lodash`, and `uuid`; review the Expo SDK bump for the CLI-chain advisories.
**Status:** Fixable now.

### 10 — Low — Plaintext credentials cached in AsyncStorage
`StorageExtension` writes full user objects (incl. plaintext `password`) to AsyncStorage (`USERS_KEY`) on every load/sync. AsyncStorage is unencrypted; any device/app with storage access can read all cached credentials. Resolved largely by fixing #2 (never persist plaintext) and not caching the full `users` set.
**Status:** Mitigatable.

---

## What's addressable under "harden in place, no Auth migration"

**Fixable now (do these):**
- **#1** Write & deploy `firestore.rules` (+ `firebase.json` block) — highest leverage.
- **#6** Sanitize markdown link/image hrefs (`onLinkPress` + render rules) in detail view and preview.
- **#8** Add length caps + `videoURL` scheme validation.
- **#9** Upgrade vulnerable dependencies (`npm audit fix`, bump runtime-reachable libs).

**Mitigatable in place (reduce risk, not a complete fix):**
- **#2** Hash passwords client-side; stop persisting plaintext (true fix needs server).
- **#3** Reserve admin usernames; recognize client-side admin check is not enforceable.
- **#4** Constrain destructive writes via rules; rework delete-by-diff sync.
- **#7** Restrict reads via rules; paginate; stop pulling full `users` to client.
- **#10** Don't persist plaintext credentials to AsyncStorage.

**Deferred — genuinely needs server-side auth:**
- **#5** Authoritative authorization (admin/ban/mute/moderation). Firestore rules give partial mitigation, but real enforcement of "who is an admin / who may ban whom" requires server-verified identity, which is out of scope for this engagement.
