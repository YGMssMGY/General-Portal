# Changelog

All notable changes to this project are documented here. The format follows Keep a Changelog and versions follow Semantic Versioning.

## 1.0.0 (2026-11-22)


### Features

* add activity dashboard widget, user provisioning, and improved logging ([232b5cd](https://github.com/YGMssMGY/General-Portal/commit/232b5cdab6d4bf8765d4c6f3593af53341ce8eba))
* add admin route and separate auth providers by environment ([c470b97](https://github.com/YGMssMGY/General-Portal/commit/c470b97c6e29cc9947dedeada0d4df5d6b7fd58e))
* add CRUD endpoints and enhance sidebar with role-based navigation ([46412b8](https://github.com/YGMssMGY/General-Portal/commit/46412b8b5473f9336bc9d8fdb2a31006ad24874d))
* add DB user lookup in dev auth and multi-assignee task input ([fbc3322](https://github.com/YGMssMGY/General-Portal/commit/fbc33226dbea0e38fe1c91de74d10ed5a4052dbb))
* add empty states, task comments, button types, and confirm modal ([8286fb9](https://github.com/YGMssMGY/General-Portal/commit/8286fb9d09b98225d47a8fa3ea108c5f712f0046))
* add member deletion endpoint, client branding env, and relax OAuth2 checks ([efbdb4a](https://github.com/YGMssMGY/General-Portal/commit/efbdb4aebb8b784d6a63cdf7f918adf312d1cca9))
* add officer role support with configurable role hierarchy ([80af38c](https://github.com/YGMssMGY/General-Portal/commit/80af38c8afe3430a63a3f3c4776c0d27fe0c0321))
* add password field to user model and support per-user authentication ([948b641](https://github.com/YGMssMGY/General-Portal/commit/948b64193b38ee62e80f2a54c2b2a8e7cdd23be6))
* add showcase page links to landing page ([adbb562](https://github.com/YGMssMGY/General-Portal/commit/adbb5622ae83b433a3fbbdfe44e816dff73f4301))
* add start scripts and clean up .gitignore ([8a47af9](https://github.com/YGMssMGY/General-Portal/commit/8a47af9e63a701cb4e8a9ff15c86b774b52769b3))
* add Teams webhook integration, budget/meetings/archive routes, and public API with API key auth ([797d982](https://github.com/YGMssMGY/General-Portal/commit/797d982d7c76768c0b2c6d22b8b9a952f711b64a))
* **admin,ui:** add Admin Accounts nav, improve page transitions, remove unused chart deps ([0dada9f](https://github.com/YGMssMGY/General-Portal/commit/0dada9f693a7d50d900e1842b50b6bf8a3cd672f))
* **analytics:** insights hub and admin observability ([4c739b7](https://github.com/YGMssMGY/General-Portal/commit/4c739b747c5201d7a91aabed881f74d99b32871e))
* **api:** events and proposals routes on Drizzle ([f9363fb](https://github.com/YGMssMGY/General-Portal/commit/f9363fb57ccc95dd2104545bad11816f834f6175))
* **api:** feature routes for polls, goals, dues, assets, decisions, time, reactions, versions, agenda, RSVPs, history, sessions, prefs, tokens, views, trash, ical, occurrences ([a60f4a8](https://github.com/YGMssMGY/General-Portal/commit/a60f4a85ce98037202c331880eb68fc8b6833475))
* **api:** search, calendar, dashboard, activity, audit, admin, settings, notifications, public APIs ([41679af](https://github.com/YGMssMGY/General-Portal/commit/41679afde67d6e5f646329f56789f3400bf58fc7))
* **api:** tasks, finance, and budget routes on Drizzle ([d720173](https://github.com/YGMssMGY/General-Portal/commit/d720173645f369cea52aec61acc9adf110760907))
* **api:** volunteers, meetings, members, kudos, messages, files, links, partnerships, purchases, subgroups, showcase ([887f69d](https://github.com/YGMssMGY/General-Portal/commit/887f69de1e5b2f6ed85139a54aa2cce1eb831d98))
* audit log for all mutations ([f657fa4](https://github.com/YGMssMGY/General-Portal/commit/f657fa4309e3aa458c1cbc857b7ddffc2868e44c))
* **auth:** hand-rolled sessions, all providers, basis-auth rules ([72a1674](https://github.com/YGMssMGY/General-Portal/commit/72a1674a89d98b3e34e2a6cdc031771cfccd25ca))
* auto-generated OpenAPI docs ([43123e2](https://github.com/YGMssMGY/General-Portal/commit/43123e20673ca93b6a543d98f95269bd64c12388))
* auto-provision admin perms for dev; update public roles and API ([ec1b37e](https://github.com/YGMssMGY/General-Portal/commit/ec1b37e6611ee47c63fec9ef28a0104aa4878013))
* back button on login page to return to portal selection ([1efb676](https://github.com/YGMssMGY/General-Portal/commit/1efb676878f8b89ac4febc33e26eb2a31ece1538))
* **backend:** add gamification, notifications, and audit logging ([72a4e9d](https://github.com/YGMssMGY/General-Portal/commit/72a4e9d06de88264ccee4a18734fdd2c16d87b6d))
* **backend:** add seeded dev accounts with roles and update auth config ([68b0962](https://github.com/YGMssMGY/General-Portal/commit/68b09623656bc825679a220ca7297a9ceb3a11aa))
* **backend:** add SQLite support, Flyway migrations, and role-based security ([d7be107](https://github.com/YGMssMGY/General-Portal/commit/d7be1078e8afa98860d1a020ecad808f5ce9bdf5))
* **backend:** initialize backend project with Prisma schema and dependencies ([168b65a](https://github.com/YGMssMGY/General-Portal/commit/168b65a71cc59bd44fecf87067c74d1ecaa4241f))
* **backend:** integrate Auth.js authentication and vitest testing ([0741d31](https://github.com/YGMssMGY/General-Portal/commit/0741d31b9afdd67666c310256aaebf6f19095566))
* **backend:** switch to PostgreSQL, add production DB scripts, and update schema ([fe67453](https://github.com/YGMssMGY/General-Portal/commit/fe67453cec8e28378ae0edf0f14a31c0417af69d))
* conditionally add publicApiRoute based on API_KEY env var ([c4b79cf](https://github.com/YGMssMGY/General-Portal/commit/c4b79cf9bc5659ff034379d4c0fb42d0d9ad5753))
* configure default dev credentials and fix member permissions ([30640c3](https://github.com/YGMssMGY/General-Portal/commit/30640c3484d5b27f5da35561ee77047ea8e25356))
* **config:** YAML-driven nav, branding and terminology; static landing; config cli ([477ff43](https://github.com/YGMssMGY/General-Portal/commit/477ff4390ba93a4426d4f0e0d586626e6d89f47a))
* **core:** session tenant context, API helpers, permissions, audit chain ([03865d2](https://github.com/YGMssMGY/General-Portal/commit/03865d236cf2eaeb0af419778b5297c1bbb8ee31))
* dark mode, mobile responsive, a11y, keyboard shortcuts, CSV export ([8b5a9cd](https://github.com/YGMssMGY/General-Portal/commit/8b5a9cd51d1af666fd5a382f149ba192f0bb938f))
* dashboard backend — more data, member count, completion rate ([f8b23f8](https://github.com/YGMssMGY/General-Portal/commit/f8b23f859328ae8bab8b343403f96a018d094dd9))
* dashboard UX density -- strip junk, compact layout, collapsible sections ([9c405a5](https://github.com/YGMssMGY/General-Portal/commit/9c405a55fcd81639931fd6affb13e076fd89bb82))
* **db,nav:** invitations storage and new feature navigation ([e2d724b](https://github.com/YGMssMGY/General-Portal/commit/e2d724bcb7824ab26a28da3ea37777edcf95cdfc))
* **db:** add task subtasks, comments, attachments, and workspace settings enhancements ([cab0900](https://github.com/YGMssMGY/General-Portal/commit/cab0900f0c98c5e0a6a1b25b71e567492c418264))
* **db:** Drizzle schema, pooled client, idempotent migrations ([ab08cf4](https://github.com/YGMssMGY/General-Portal/commit/ab08cf43b7ee61a39a0227774367e25b000596f6))
* **db:** feature tables, metadata persistence, legacy text-id conversion ([98fc2df](https://github.com/YGMssMGY/General-Portal/commit/98fc2df196c04cc486fd52d158b71a0db10bbe5e))
* **deploy:** Docker, Compose, devcontainer, Helm and single-DB guidance ([92af31e](https://github.com/YGMssMGY/General-Portal/commit/92af31e326d9c0da964696bb64df17d0e283913a))
* **deploy:** single-DB PaaS mode and per-PR preview sites ([bd28385](https://github.com/YGMssMGY/General-Portal/commit/bd28385d636314716a3794e46156082788efaab5))
* **deploy:** YAML deployment registry, reconcile, seed packs ([5cb8e2d](https://github.com/YGMssMGY/General-Portal/commit/5cb8e2d2378da70cf5ed57295da70a46bc5bdd8c))
* **dev-setup:** preserve existing database on dev, add admin user API ([6e0c166](https://github.com/YGMssMGY/General-Portal/commit/6e0c1668cf25d4f40386b558752b1cf8bf831759))
* dynamically load members for task assignee selection ([b25cdcd](https://github.com/YGMssMGY/General-Portal/commit/b25cdcd152104c3c568dd7acc693f16e177f6f8e))
* extend UserDto to include workspace name and role ([d0ef7ec](https://github.com/YGMssMGY/General-Portal/commit/d0ef7ec70cd04d8eb45884a7d1a627a885fb0360))
* General Portal 2.0 - general multi-workspace OS, hardened and agent-operable ([ab2adf6](https://github.com/YGMssMGY/General-Portal/commit/ab2adf6d3da196c5e90fa4e53b13d41b327a4f32))
* **i18n,lib:** five-locale catalogues, background jobs, report writers, domain helpers ([c39ace2](https://github.com/YGMssMGY/General-Portal/commit/c39ace20a2df1f8030ac030d794ffed5bebf3676))
* **i18n:** message catalogues for five locales ([adb1f74](https://github.com/YGMssMGY/General-Portal/commit/adb1f74427ad09bb189d75ebcf670457915c2cc8))
* integrate gamification, kudos, WebSocket presence, and nudge scheduler ([116c71f](https://github.com/YGMssMGY/General-Portal/commit/116c71fd0ccf08146e27f775b98429286a0a1e9b))
* Microsoft-only auth with email whitelist ([05bf7e2](https://github.com/YGMssMGY/General-Portal/commit/05bf7e2d6581c5c4be58fed215231062b03b11d5))
* migrate backend from Spring Boot to Hono and Auth.js ([6b11a39](https://github.com/YGMssMGY/General-Portal/commit/6b11a3919c31db7bc9e3aad098d93808c4ada7ef))
* migrate backend from Spring Boot to Hono, update dev/prod scripts ([b24728f](https://github.com/YGMssMGY/General-Portal/commit/b24728f02ab9801af68cb1646751459b20b3f989))
* **nav,i18n:** wire final features into navigation and five locales ([bfee61c](https://github.com/YGMssMGY/General-Portal/commit/bfee61c55b1c237ad62a09edff6ce2ee8743d5d0))
* **ops:** shared action registry, HTTPS operator API, zero-install cli ([bfdc6c9](https://github.com/YGMssMGY/General-Portal/commit/bfdc6c9571cd9673966488f57c7aa2a85d7cfdd5))
* page transitions, memo, skeletons, error boundaries ([ea52930](https://github.com/YGMssMGY/General-Portal/commit/ea52930688abbfa8c506392c026888c8c34d3d9d))
* **permissions:** custom role matrix and generic comments ([5c199b0](https://github.com/YGMssMGY/General-Portal/commit/5c199b0ab6dc9a7dba228b8a3262af167a57dffb))
* Phase 2+6 — button types, empty state actions, frontend cleanup, public showcase CRUD ([cf14ce6](https://github.com/YGMssMGY/General-Portal/commit/cf14ce60a4e599bca0a1a018ecea31cf552afd08))
* Pino logger, API response envelope, resourceRoute factory, getAuthUser ([1615d0b](https://github.com/YGMssMGY/General-Portal/commit/1615d0b8f21e09358f9732e07dc0f68d0c4b7ff9))
* **platform:** SCIM, translation review, changelog, scheduled backups and metrics ([069ab85](https://github.com/YGMssMGY/General-Portal/commit/069ab8584da2b9c320b4bb4731aac8631e02a41d))
* portal landing page, portal-aware routing ([30d370b](https://github.com/YGMssMGY/General-Portal/commit/30d370beeff437d57b9354a2e934033dcda2f3c2))
* PostgreSQL schema, dual PrismaClient, portal middleware, test infra ([a824a99](https://github.com/YGMssMGY/General-Portal/commit/a824a99f2ed2136d88111648ed2de7e9702f781e))
* **prisma:** migrate to SQLite, add new models and fields for enhanced functionality ([12ac410](https://github.com/YGMssMGY/General-Portal/commit/12ac4103e36b980252a7bb7163d4978e28893e88))
* **product:** close all remaining feature gaps ([0d16607](https://github.com/YGMssMGY/General-Portal/commit/0d1660711ba5c03947a332a2d9ed9ad048f115ea))
* **product:** My Work, invitations, presets, branding editor and UX ([cc4400d](https://github.com/YGMssMGY/General-Portal/commit/cc4400de7ecf6e476446a1e579913156285b5594))
* proper Prisma enums, fix type drifts ([7218679](https://github.com/YGMssMGY/General-Portal/commit/7218679587dd6551a10e225e20d958034eda97a4))
* **pwa:** offline shell, in-product changelog and final operator actions ([aa785df](https://github.com/YGMssMGY/General-Portal/commit/aa785df8bb30b492df11a2207efdbe820503684f))
* rebrand to Club Portal and replace Tailwind config for Carbon Design System ([f87e3b0](https://github.com/YGMssMGY/General-Portal/commit/f87e3b0975b48f21f7081849aa5af07704760327))
* refactor all routes to use portal-aware db + factory ([f8c8e19](https://github.com/YGMssMGY/General-Portal/commit/f8c8e191b81fd66d889160c093120fbb9b2fc4d8))
* remove WebSocket, credentials auth, account creation ([2003575](https://github.com/YGMssMGY/General-Portal/commit/20035759aaded3cf4741ade940884eed858fcd46))
* replace demo mode with dev login system ([5280e01](https://github.com/YGMssMGY/General-Portal/commit/5280e014a813b755ab35b3a5180c259b032ca8f0))
* **repo:** GitHub community standards and full CI stack ([bbc1116](https://github.com/YGMssMGY/General-Portal/commit/bbc11160d0f62067642e47a482149b5c62020a0f))
* schema relations, backend fixes, audit resolutions ([b360815](https://github.com/YGMssMGY/General-Portal/commit/b3608156ef41452679a3a84b584d355ce2bb8a64))
* **sdk:** typed client and full API description ([0d771dd](https://github.com/YGMssMGY/General-Portal/commit/0d771ddf31709c93867813f751c5930b7ce90258))
* **security:** CSP nonces, token auth, webhook fan-out, extended permissions ([864526d](https://github.com/YGMssMGY/General-Portal/commit/864526de359695652f59f5891c66dbbbc7f93b61))
* **seeder:** add seed data for PublicEvent and Photo entities ([faa7ff0](https://github.com/YGMssMGY/General-Portal/commit/faa7ff049f5bb33e3da391a3dcea1845605a114d))
* **seo:** technical SEO, structured data and marketing site ([da6d37d](https://github.com/YGMssMGY/General-Portal/commit/da6d37d267c8792acd702434bbb01f4cf79bcc1a))
* shared permission module, remove 3-way duplication ([bd2f8e6](https://github.com/YGMssMGY/General-Portal/commit/bd2f8e6217e473da540414e2960bee199cb79d77))
* **shell:** auth-gated middleware, i18n routing, self-hosted fonts, public pages ([ccf4359](https://github.com/YGMssMGY/General-Portal/commit/ccf4359599f276be66e6de658b002495456ece5d))
* soft delete support ([df15b3d](https://github.com/YGMssMGY/General-Portal/commit/df15b3d3f3cb0a38cd9563c5191c6f47e8b93a5d))
* subpage UX overhaul -- PageLayout, whitespace, mobile, toasts ([d94a6d4](https://github.com/YGMssMGY/General-Portal/commit/d94a6d48809e61da89c30e7898cfc3c4667b2a7b))
* switch to SQLite for zero-setup development ([44cc9d4](https://github.com/YGMssMGY/General-Portal/commit/44cc9d4d614a09a45c8c1b5d705acf26b83f1d96))
* TanStack Query, Zustand, Sentry, optimistic updates, lazy loading ([9634acc](https://github.com/YGMssMGY/General-Portal/commit/9634acce0a9c07993ad8f7dd5ae9772dec2bd9bb))
* **tui:** ink control plane with guarded destructive operations ([7e085e8](https://github.com/YGMssMGY/General-Portal/commit/7e085e8096455c379c10bf992474cc8f60eed13b))
* **tui:** registry-driven action console and HTTPS-only remote guidance ([c5cd46e](https://github.com/YGMssMGY/General-Portal/commit/c5cd46e64bdbd92837b583f83aff9aba300e81ba))
* **ui:** feature pages, nav registry, server favicon, render-time state ([7e191ad](https://github.com/YGMssMGY/General-Portal/commit/7e191adccf26ae4f0547242c33fb1d8fbee7eef6))
* **ui:** full shadcn component set with confirmation dialogs ([fa449b8](https://github.com/YGMssMGY/General-Portal/commit/fa449b8b50dba076f3dc21de68d7427fdeb9b887))
* unified app factory, simplified entry points ([2209573](https://github.com/YGMssMGY/General-Portal/commit/22095730855d90f458275597447e0a250d31f915))
* whitelist role selector, email isolation, speed improvements ([05faeb7](https://github.com/YGMssMGY/General-Portal/commit/05faeb79b54977a656bdea9cdc12339e8f1c6c22))
* **workflows:** builder UI, live presence and participation badges ([7233643](https://github.com/YGMssMGY/General-Portal/commit/7233643e6658c624dbf2b351671c6e58b52a510f))


### Bug Fixes

* auth AdapterError — getDbUrl now uses env.ts fallbacks instead of raw process.env ([f593ffa](https://github.com/YGMssMGY/General-Portal/commit/f593ffaf7833c4d1d9b0990b8383b0a35822760a))
* auth uses portal middleware's db, portal redirect loading state ([88c3718](https://github.com/YGMssMGY/General-Portal/commit/88c37184fd8200be518b3a01121ba56a3db2160f))
* **auth:** handle missing user and improve error logging ([ac02505](https://github.com/YGMssMGY/General-Portal/commit/ac02505e76ae2cd7fa87c2b613f90edfccb9eba0))
* **auth:** handle provisioning errors and improve login error messages ([f338e5f](https://github.com/YGMssMGY/General-Portal/commit/f338e5f49017afdc554d1daa84d2a73ae0cc68eb))
* backend startup logging (flush stdout before import, use process.stdout.write in server callback) ([33f21c0](https://github.com/YGMssMGY/General-Portal/commit/33f21c0899532028df7b13e44ab2ad6d4b4eca30))
* broken Prisma indexes (dueDate on FinanceTransaction, occurredAt on WorkspaceFile, userId on AuditLog) ([c6ee18e](https://github.com/YGMssMGY/General-Portal/commit/c6ee18e757ad90f6c753f50678269c66c47a9c9b))
* **ci:** make auth limiter configurable for high-throughput test runs ([de5db46](https://github.com/YGMssMGY/General-Portal/commit/de5db46c4b88f4f215bf35009855ccf9af6e1378))
* **ci:** make marketing pages public and seed from deployment.yaml ([2d9a563](https://github.com/YGMssMGY/General-Portal/commit/2d9a563be3882940d9305c7635e9793832e5e83e))
* **codeql:** escape shell/YAML/HTML values and avoid logging secrets ([d25b10f](https://github.com/YGMssMGY/General-Portal/commit/d25b10fad80b69b9a74935c10aa72cc1fab7b60f))
* **config:** Turbopack-proof log level, configurable pool max, no NODE_ENV leak ([6104b19](https://github.com/YGMssMGY/General-Portal/commit/6104b19dc56d641744b2b217ed1cbf300d252f18))
* cross-portal user leak in whitelist and seed ([8873aa4](https://github.com/YGMssMGY/General-Portal/commit/8873aa4a20812cc377fbc410d61eaccce3e0941c))
* dashboard 401 — requireWorkspace needs async getAuthUser from @hono/auth-js ([cbec81c](https://github.com/YGMssMGY/General-Portal/commit/cbec81cb702b1848880351817afbcd3ec8c1975f))
* dashboard greeting shows full name, remove credentials login from useAuth ([3e25a7c](https://github.com/YGMssMGY/General-Portal/commit/3e25a7c7f9dd2086243becf9d9da81bdef5973e4))
* **db:** audit chain timestamps, uniqueness, indexes and cursor headers ([c8bcfea](https://github.com/YGMssMGY/General-Portal/commit/c8bcfea3865380358e30eee73d6041f3d64dacc2))
* **e2e:** ops type import and responsive nav assertion ([e9bcf1b](https://github.com/YGMssMGY/General-Portal/commit/e9bcf1b93ecae271efe45f399eea64a88a0f1b2a))
* favicon cleanup, white background on login avatar ([4240c8f](https://github.com/YGMssMGY/General-Portal/commit/4240c8fa5abd8434aec775b77313ed8f22b6ac35))
* finalize cursor headers and migration journal ([ff61f4f](https://github.com/YGMssMGY/General-Portal/commit/ff61f4f72765e1eb7806237924999a13f6444997))
* frontend types align with backend ([b96203a](https://github.com/YGMssMGY/General-Portal/commit/b96203ac1b7180eccd84290b66d3a09b35f487d5))
* frontend/backend type mismatches, event status, module API, hardcoded text ([516130c](https://github.com/YGMssMGY/General-Portal/commit/516130c7d1b91cca00b4df7099c93d21e83c5959))
* **frontend:** correct icon rendering and handle undefined members array ([b6e284d](https://github.com/YGMssMGY/General-Portal/commit/b6e284d81ea63b06584fd9987d64adb9331d35e7))
* MemberSelect data shape, stats.html cleanup, visualizer removal ([b242a1b](https://github.com/YGMssMGY/General-Portal/commit/b242a1b149303ac81f9b5a8c34ff744a11074ea4))
* messaging map crash, showcase responsive, mobile optimization ([28d8256](https://github.com/YGMssMGY/General-Portal/commit/28d82564afffe205a5f9d5bda4edc4987a2fb8b9))
* migrate auth type safety - replace (auth?.token as any) with typed getAuthUser wrapper ([9077797](https://github.com/YGMssMGY/General-Portal/commit/907779781b1c3997d1815a50f34411794fa0d352))
* no favicon/title at landing, portal-aware UIShell, switch portal button ([22f39fb](https://github.com/YGMssMGY/General-Portal/commit/22f39fb2c6ab2f0f428c08b766c7cf8dcd70916d))
* **ops:** single-DB destructive guards and encrypted backup parity ([3c4c5da](https://github.com/YGMssMGY/General-Portal/commit/3c4c5daed9a0cd0b534c2f6a24472b734fae6357))
* Phase 0-5 audit fixes — security, API correctness, and dead code cleanup ([02369d1](https://github.com/YGMssMGY/General-Portal/commit/02369d15bfdec53086c00b1a076fa3d398e8f74c))
* photos endpoint, mobile overflow, portal toggle ([81cb2ac](https://github.com/YGMssMGY/General-Portal/commit/81cb2aca8de2e4edb171a01da15a995174c81cfa))
* portal-aware auth config — each portal uses its own DB for auth ([8b35d97](https://github.com/YGMssMGY/General-Portal/commit/8b35d97d496efc12fd6c561f85eb2b6381dbb5aa))
* portal-aware favicon/title, Carbon landing page, prettier config at root ([64db018](https://github.com/YGMssMGY/General-Portal/commit/64db0189a807dced4e7832476bba7219d831a52f))
* portal-aware login + branding, Carbon landing page, direct Microsoft sign-in ([d0b199b](https://github.com/YGMssMGY/General-Portal/commit/d0b199bd0104d2b20691abf88155f45f86eb637a))
* prod serveStatic path, dev auth visibility ([1d34d0f](https://github.com/YGMssMGY/General-Portal/commit/1d34d0f536cd14f4af6092bd1de4c4a3252e4045))
* proposals empty state with create button, messages show real author name ([b2e9e90](https://github.com/YGMssMGY/General-Portal/commit/b2e9e90ff7de2cd79ff839e693a8451dfeb4de18))
* remove participantIds from sendMessage call (unsupported by API type) ([1d5d842](https://github.com/YGMssMGY/General-Portal/commit/1d5d84212737a63867a8bedcfcdf978b04d1a60d))
* rename displayName→name, avatarUrl→image to match PrismaAdapter expectations ([c2b208a](https://github.com/YGMssMGY/General-Portal/commit/c2b208a7986950d8b0e6aa715fd986cfcaf97432))
* rename UserAccount → User to match PrismaAdapter expectations ([a7c4b17](https://github.com/YGMssMGY/General-Portal/commit/a7c4b17bb4928e77a1cdeaa3d81c4feb9e16a78c))
* restore type/occurredAt fields, fix public-api orderBy ([e3de42b](https://github.com/YGMssMGY/General-Portal/commit/e3de42b363e1f4b86066e9dce61caa377df1e7fb))
* **review:** close correctness findings and add absolute canonical URLs ([c77635d](https://github.com/YGMssMGY/General-Portal/commit/c77635d32705174b177c6aa88b3e3a7121775280))
* **review:** close performance findings and CI seeding gaps ([d59a045](https://github.com/YGMssMGY/General-Portal/commit/d59a045cb4f8f144bcbdf926172dc75fb3133b2d))
* **review:** close security findings from PR review ([33f78f3](https://github.com/YGMssMGY/General-Portal/commit/33f78f36a3db369b58b3f1c03151e29f38fb276a))
* **security:** close audit-found web-facing vulnerabilities ([a90b4ae](https://github.com/YGMssMGY/General-Portal/commit/a90b4ae3573a9515b80c7f61e088f319d71a8247))
* **security:** streamed magic-byte uploads, SSRF pinning, shared rate limits, CSRF ([127c579](https://github.com/YGMssMGY/General-Portal/commit/127c579cf736a8b2aa216ba371c351f64ffe5925))
* seed.ts fallback DB URL, dev-setup.mjs better error handling ([ea0414d](https://github.com/YGMssMGY/General-Portal/commit/ea0414dc1a8b548f6c6c459608f9484c96d76e15))
* **service:** add null check for proposal ID in updateProposal ([c29a461](https://github.com/YGMssMGY/General-Portal/commit/c29a461b129cbbac79e12b616c0f84bdc9aead1b))
* session name/email, events status/owners, dev script, charAt crashes, stats.html ignored ([2ac4a00](https://github.com/YGMssMGY/General-Portal/commit/2ac4a00b3a1aab7b2fb7adf42ba0cdced6095b66))
* startup speed, Vite proxy noise, NODE_ENV warning, Carbon landing page ([bd40553](https://github.com/YGMssMGY/General-Portal/commit/bd40553877f93461b741cd3f01d5f737983009ff))
* task creation priority mismatch, duplicate keys, WebSocket removal ([d0dc57e](https://github.com/YGMssMGY/General-Portal/commit/d0dc57e244016a4b65c45a5f6570b904272b2faf))
* **ui:** close nav, feature-flag, i18n and accessibility gaps ([b97d06b](https://github.com/YGMssMGY/General-Portal/commit/b97d06b582cb1417df973f900d01c230ada17fa9))
* ungate SEO/PWA endpoints, remove magic slug, correct counts ([93bcc3e](https://github.com/YGMssMGY/General-Portal/commit/93bcc3eda94fb918381dffebba7e6fb64a04f857))
* update Carbon import and tsconfig module resolution ([0c71add](https://github.com/YGMssMGY/General-Portal/commit/0c71adda660a7229d6ced9cfcf1c5ca852522595))
* update test mocks for requireAdmin workspace verification and requireApiKey db lookup ([9e869b8](https://github.com/YGMssMGY/General-Portal/commit/9e869b8a60b5ccbb47fcb1ee6c430510afd78fcc))
* Vite proxy timeout + suppress ECONNREFUSED noise during startup ([334efeb](https://github.com/YGMssMGY/General-Portal/commit/334efebfa583b23a16ea5d05e4cf8bf093581279))
* WebSocket security, decimal serialization, security hardening ([39676e0](https://github.com/YGMssMGY/General-Portal/commit/39676e0d8d19ee519d44ce5cef1b5149bfbd7ea5))
* wildcard route middleware and simplify message creation ([315d0df](https://github.com/YGMssMGY/General-Portal/commit/315d0dff901226e97c3e23d75413ef8dd6398699))


### Performance Improvements

* dashboard, search, nudge, indexes, compression, cache, chunks, full-text search, fonts, vitals ([ad0badf](https://github.com/YGMssMGY/General-Portal/commit/ad0badf0cb70a20cffe0c139e30b4d43304f1cf4))
* eliminate N+1 queries and unbounded work ([9bf90f5](https://github.com/YGMssMGY/General-Portal/commit/9bf90f566a2cd796e7c20660b7b1d99a4477deac))

## [2.0.0]

### Added

- Drizzle ORM with one PostgreSQL database per workspace and idempotent migrations
- Hand-rolled opaque Postgres sessions with rotation, instant revocation and nine sign-in providers
- YAML deployment registry with insert-only reconcile, presets and an operator CLI
- Ink operator console with typed confirmations, verified backups and an audit trail
- HTTPS operator API with a shared action registry, scoped tokens and zero-install curl/irm access
- Forty-plus modules: tasks, events, proposals, finance, meetings, polls, goals, dues, assets, workflows, attendance, participation and more
- Five-locale interface: en-US, zh-CN, de-DE, fr-FR, es-ES
- Scheduled backups, report generation, webhook delivery, retention and link-health jobs
- Technical SEO, structured data and a public marketing site
- Unit, smoke, E2E, operator, accessibility and quality gate suites

### Changed

- Replaced Prisma and NextAuth with Drizzle and the custom auth layer
- Navigation, branding, terminology and modules are now driven by `deployment.yaml`
- Landing page is statically generated and uses crawlable links

### Security

- Streamed magic-byte upload validation and SSRF-safe URL fetching
- Shared Postgres rate limits and origin-based CSRF checks
- Nonce-based Content Security Policy and HTTPS-only operator access
- Upgraded Next.js to the latest patched release
