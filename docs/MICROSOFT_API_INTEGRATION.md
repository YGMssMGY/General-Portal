# Microsoft API Integration

This project uses the local Spring Boot backend as the only place that should talk to Microsoft APIs. The React app should call this backend through `frontend/src/api/workspaceApi.ts`; it should not call Microsoft Graph directly and should never store Microsoft client secrets in Vite environment variables.

## Where Credentials Go

1. Copy `.env.example` to `.env.local`.
2. Fill these values from your Microsoft Entra app registration:

```powershell
MICROSOFT_TENANT_ID=your-tenant-id
MICROSOFT_CLIENT_ID=your-application-client-id
MICROSOFT_CLIENT_SECRET=your-client-secret
ORGFLOW_DEMO_MODE=false
```

`start-dev.ps1` loads `.env.local` before it starts the backend and frontend. `.env.local` is ignored by git.

## Microsoft Entra App Registration

Create one web app registration in Microsoft Entra admin center:

- Platform type: Web
- Redirect URI: `http://localhost:8080/login/oauth2/code/microsoft`
- Local frontend origin: `http://localhost:5173`
- Minimum delegated permissions for login/profile: `openid`, `profile`, `email`, `User.Read`

For production, add the production backend redirect URI as another Web redirect URI.

## Where API Code Goes

- Frontend API wrappers: `frontend/src/api/workspaceApi.ts`
- Frontend feature hooks: `frontend/src/hooks/useWorkspaceResources.ts`
- Backend REST controllers: `backend/src/main/java/com/orgflow/portal/controller`
- Backend business logic: `backend/src/main/java/com/orgflow/portal/service`
- Backend DTOs: `backend/src/main/java/com/orgflow/portal/dto/Dtos.java`
- Backend Microsoft Graph clients: add under `backend/src/main/java/com/orgflow/portal/integration/microsoft`

When adding a Microsoft API feature, use this path:

1. Add or update a backend DTO in `Dtos.java`.
2. Add a backend service method that calls Microsoft Graph.
3. Add a REST endpoint in a controller.
4. Add the matching frontend function in `workspaceApi.ts`.
5. Add or update a custom hook in `useWorkspaceResources.ts`.
6. Wire the UI component to that hook.

## Current API Boundary

The frontend now uses live backend data only. The old mock fallback data has been removed.

Implemented backend writes:

- `POST /api/tasks`
- `POST /api/proposals`

Read-only until Microsoft-backed endpoints are added:

- files
- finance
- members
- messages
- settings

## Microsoft Docs

- Microsoft identity platform OAuth/OIDC: https://learn.microsoft.com/en-us/entra/identity-platform/v2-protocols
- Microsoft OAuth authorization code flow: https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow
- Microsoft Graph overview: https://learn.microsoft.com/en-us/graph/overview
