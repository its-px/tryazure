# How to add a new Professional

## Prerequisites
- You need the tenant's UUID (find it in Table Editor → `tenants`)

## Steps

### 1. User signs up
Have the person sign up at the app URL (Google OAuth or email).  
This auto-creates a row in `auth.users` and `profiles`.

### 2. Add to `professionals` table
Table Editor → `professionals` → Insert row:

| column | value |
|--------|-------|
| `name` | Full name, e.g. `Nikos Papadopoulos` |
| `code` | Short identifier, e.g. `nikos` — used everywhere internally |
| `tenant_id` | UUID of the tenant |

### 3. Update their profile
Table Editor → `profiles` → find row by email → edit:

| column | value |
|--------|-------|
| `role` | `professional` |
| `tenant_id` | same tenant UUID as above |

### 4. Set professional_code in auth metadata
Authentication → Users → click user → Edit user → User Metadata:

```json
{ "professional_code": "nikos" }
```

The `code` here must exactly match the `code` column you set in step 2.

## Result
When the user logs in at the correct tenant URL they are routed to `ProfessionalPanel` and see only their bookings for that tenant.

## Notes
- A professional can only belong to one tenant (`profiles.tenant_id` enforces this at routing level)
- The `professionals` table row controls what appears in the booking wizard
- The `user_metadata.professional_code` links the auth user to that row
