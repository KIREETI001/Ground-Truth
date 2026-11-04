> Historical notes, superseded by the local-only implementation. See [current setup and architecture](local-project-mvp.md). Live deployment is outside the current scope.

# Shared login and profile routing

The public entry point is /login. Root / redirects signed-out visitors there and signed-in visitors to the home for their database-backed role: user → /user, teacher → /teacher, developer → /developer.

There is no public role selector or cross-role navigation. Server layouts require authentication and the matching profile role before rendering each workspace. A wrong-role URL redirects to the account's own home. User learning, project, profile and playground routes share the user gate. The legacy /tutor URL shares the teacher gate. Existing protected APIs continue to enforce their independent authorization and ownership checks; these gates do not replace API security.

Authentication uses the existing ChatGPT sign-in provider. Role assignment remains in platform_access and is managed by an authorized developer. This adds no separate password database or public registration flow. Local sign-in still simulates local_seedy, whose stored role is developer; local sign-in therefore opens the developer workspace automatically.

Verified locally: anonymous /, /user, /teacher, /developer, /workspace and /learn return redirects to /login; browser sign-in opens /developer for the local profile; direct /teacher access with that profile redirects to /developer; sign-out returns to /login. All 161 backend tests, type checking and production build passed. Distinct hosted user/teacher identities still require deployment verification.

The earlier three-platform public homepage and platform-switcher descriptions in planning documents are superseded by this flow. For the live pitch, begin at this common login and demonstrate each workspace with an appropriately assigned account.
