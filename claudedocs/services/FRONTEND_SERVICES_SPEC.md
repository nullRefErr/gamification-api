# Frontend Services Specification
**Homepage & Admin Dashboard - Next.js 14 + shadcn/ui**

> **Service Type**: Frontend Applications
> **Framework**: Next.js 14 (App Router)
> **UI Library**: shadcn/ui + Radix UI + Tailwind CSS
> **State Management**: React Query + Zustand
> **Authentication**: NextAuth.js
> **Phase**: Phase 1 (Admin) + Phase 2 (Homepage)
> **Priority**: P0 (Admin), P1 (Homepage)

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Project Structure](#project-structure)
4. [Technology Stack](#technology-stack)
5. [Admin Dashboard Service](#admin-dashboard-service)
6. [Homepage Service](#homepage-service)
7. [Shared Component Library](#shared-component-library)
8. [Authentication & Authorization](#authentication--authorization)
9. [API Integration](#api-integration)
10. [State Management](#state-management)
11. [Styling & Theming](#styling--theming)
12. [Development Setup](#development-setup)
13. [Deployment](#deployment)
14. [Testing Strategy](#testing-strategy)
15. [Performance Optimization](#performance-optimization)

---

## Overview

### Purpose

The Frontend Services provide two distinct web applications for the Gamification API platform:

1. **Admin Dashboard**: Internal management interface for platform administrators
2. **Homepage**: Public-facing portal for tenant users and marketing

Both applications are built with Next.js 14, share a common component library, and integrate seamlessly with the API Gateway.

### Key Features

**Admin Dashboard**:
- Tenant management (CRUD operations)
- User management and permissions
- Real-time analytics dashboards
- System configuration UI
- Service health monitoring
- Rules engine visual editor
- Achievement/reward configuration
- Audit logs and reporting

**Homepage**:
- Marketing landing pages
- User authentication portal
- Personal dashboard for end-users
- Achievement showcase
- Leaderboards and social features
- Quest/mission tracking UI
- Reward redemption interface
- Documentation and API explorer

### Success Metrics

- **Performance**: First Contentful Paint < 1.5s, Time to Interactive < 3s
- **Accessibility**: WCAG 2.1 AA compliance
- **SEO**: Lighthouse score > 90 for homepage
- **Mobile**: Full responsive design, touch-optimized
- **UX**: Clean, intuitive interface with consistent design system

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Nx Monorepo Root                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   apps/     │  │    libs/    │  │  claudedocs/│        │
│  ├─────────────┤  ├─────────────┤  └─────────────┘        │
│  │             │  │             │                           │
│  │ homepage    │  │ ui          │  Configuration            │
│  │ (Next.js)   │  │ (shadcn)    │  & Documentation          │
│  │ Port: 3001  │  │             │                           │
│  │             │  │ api-client  │                           │
│  │ admin       │  │ (Shared)    │                           │
│  │ (Next.js)   │  │             │                           │
│  │ Port: 3002  │  │ types       │                           │
│  │             │  │ (TypeScript)│                           │
│  │ gateway     │  │             │                           │
│  │ (NestJS)    │  │ hooks       │                           │
│  │ Port: 3000  │  │ (React)     │                           │
│  └─────────────┘  └─────────────┘                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
    Homepage UI          Admin UI           API Gateway
    (Public)           (Internal)         (Backend Hub)
         │                    │                    │
         └────────────────────┴────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │   API Gateway    │
                    │   Port: 3000     │
                    └──────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
    Achievement          Analytics            Rules Engine
    Service              Service              Service
    (and 13 other microservices)
```

### Service Boundaries

| Service | Responsibility | Users |
|---------|---------------|-------|
| **Homepage** | Public marketing, user portal | End users, prospects |
| **Admin** | Platform management, configuration | Admins, operators |
| **UI Library** | Shared components, design system | Both apps |
| **API Client** | HTTP client, data fetching logic | Both apps |

### Communication Flow

```
User Browser
    │
    ├─ Homepage (Next.js) → API Gateway (JWT) → Microservices
    │                          │
    │                          └─ NextAuth Session
    │
    └─ Admin (Next.js) → API Gateway (JWT + Admin Role) → Microservices
                             │
                             └─ NextAuth Session + RBAC
```

---

## Project Structure

### Nx Monorepo Layout

```
gamification-api/
├── apps/
│   ├── homepage/                    # Public-facing Next.js app
│   │   ├── src/
│   │   │   ├── app/                # Next.js 14 App Router
│   │   │   │   ├── (auth)/        # Auth route group
│   │   │   │   │   ├── login/
│   │   │   │   │   └── register/
│   │   │   │   ├── (marketing)/   # Marketing pages
│   │   │   │   │   ├── page.tsx   # Landing page
│   │   │   │   │   ├── features/
│   │   │   │   │   ├── pricing/
│   │   │   │   │   └── docs/
│   │   │   │   ├── (dashboard)/   # User dashboard
│   │   │   │   │   ├── dashboard/
│   │   │   │   │   ├── achievements/
│   │   │   │   │   ├── quests/
│   │   │   │   │   ├── leaderboard/
│   │   │   │   │   └── rewards/
│   │   │   │   ├── api/           # API routes
│   │   │   │   │   └── auth/      # NextAuth endpoints
│   │   │   │   ├── layout.tsx
│   │   │   │   └── globals.css
│   │   │   ├── components/        # Page-specific components
│   │   │   ├── lib/               # App utilities
│   │   │   └── middleware.ts      # Next.js middleware
│   │   ├── public/
│   │   ├── next.config.js
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   └── project.json           # Nx config
│   │
│   ├── admin/                       # Admin dashboard Next.js app
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── (auth)/
│   │   │   │   │   └── login/
│   │   │   │   ├── (dashboard)/   # Admin dashboard
│   │   │   │   │   ├── layout.tsx # Sidebar layout
│   │   │   │   │   ├── dashboard/ # Overview
│   │   │   │   │   ├── tenants/   # Tenant CRUD
│   │   │   │   │   ├── users/     # User management
│   │   │   │   │   ├── analytics/ # Analytics dashboards
│   │   │   │   │   ├── services/  # Service health
│   │   │   │   │   ├── rules/     # Rules engine UI
│   │   │   │   │   ├── achievements/ # Achievement config
│   │   │   │   │   ├── rewards/   # Reward config
│   │   │   │   │   ├── settings/  # Platform settings
│   │   │   │   │   └── audit/     # Audit logs
│   │   │   │   ├── api/
│   │   │   │   │   └── auth/
│   │   │   │   ├── layout.tsx
│   │   │   │   └── globals.css
│   │   │   ├── components/
│   │   │   ├── lib/
│   │   │   └── middleware.ts
│   │   ├── public/
│   │   ├── next.config.js
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   └── project.json
│   │
│   └── gateway/                     # Existing API Gateway (NestJS)
│
├── libs/
│   ├── ui/                          # Shared UI component library
│   │   ├── src/
│   │   │   ├── components/        # shadcn/ui components
│   │   │   │   ├── ui/            # Base components
│   │   │   │   │   ├── button.tsx
│   │   │   │   │   ├── card.tsx
│   │   │   │   │   ├── dialog.tsx
│   │   │   │   │   ├── form.tsx
│   │   │   │   │   ├── input.tsx
│   │   │   │   │   ├── table.tsx
│   │   │   │   │   ├── toast.tsx
│   │   │   │   │   └── ... (50+ components)
│   │   │   │   ├── business/      # Business components
│   │   │   │   │   ├── achievement-card.tsx
│   │   │   │   │   ├── leaderboard-table.tsx
│   │   │   │   │   ├── quest-tracker.tsx
│   │   │   │   │   ├── reward-card.tsx
│   │   │   │   │   ├── stats-card.tsx
│   │   │   │   │   └── tenant-selector.tsx
│   │   │   │   └── layout/        # Layout components
│   │   │   │       ├── header.tsx
│   │   │   │       ├── sidebar.tsx
│   │   │   │       ├── footer.tsx
│   │   │   │       └── page-container.tsx
│   │   │   ├── lib/
│   │   │   │   └── utils.ts       # cn() utility
│   │   │   └── index.ts
│   │   ├── tailwind.config.ts
│   │   └── project.json
│   │
│   ├── api-client/                  # Shared API client
│   │   ├── src/
│   │   │   ├── client/
│   │   │   │   ├── base-client.ts
│   │   │   │   ├── auth-client.ts
│   │   │   │   ├── tenant-client.ts
│   │   │   │   ├── achievement-client.ts
│   │   │   │   ├── quest-client.ts
│   │   │   │   ├── reward-client.ts
│   │   │   │   ├── analytics-client.ts
│   │   │   │   └── index.ts
│   │   │   ├── config/
│   │   │   │   └── api-config.ts
│   │   │   └── index.ts
│   │   └── project.json
│   │
│   ├── types/                       # Shared TypeScript types
│   │   ├── src/
│   │   │   ├── entities/
│   │   │   │   ├── tenant.types.ts
│   │   │   │   ├── user.types.ts
│   │   │   │   ├── achievement.types.ts
│   │   │   │   ├── quest.types.ts
│   │   │   │   ├── reward.types.ts
│   │   │   │   └── analytics.types.ts
│   │   │   ├── api/
│   │   │   │   ├── request.types.ts
│   │   │   │   ├── response.types.ts
│   │   │   │   └── error.types.ts
│   │   │   └── index.ts
│   │   └── project.json
│   │
│   └── hooks/                       # Shared React hooks
│       ├── src/
│       │   ├── use-tenant.ts
│       │   ├── use-achievements.ts
│       │   ├── use-quests.ts
│       │   ├── use-rewards.ts
│       │   ├── use-analytics.ts
│       │   ├── use-auth.ts
│       │   └── index.ts
│       └── project.json
│
├── claudedocs/                      # Documentation
└── package.json                     # Root package.json
```

---

## Technology Stack

### Core Technologies

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| **Framework** | Next.js | 14.2+ | React framework with SSR/SSG |
| **Runtime** | Node.js | 22 LTS | JavaScript runtime |
| **Language** | TypeScript | 5.7+ | Type safety |
| **UI Library** | shadcn/ui | Latest | Component library |
| **Component Primitives** | Radix UI | Latest | Accessible components |
| **Styling** | Tailwind CSS | 3.4+ | Utility-first CSS |
| **State Management** | React Query | 5.0+ | Server state |
| **State Management** | Zustand | 4.5+ | Client state |
| **Authentication** | NextAuth.js | 5.0+ | Auth solution |
| **Forms** | React Hook Form | 7.50+ | Form handling |
| **Validation** | Zod | 3.22+ | Schema validation |
| **Icons** | Lucide React | Latest | Icon library |
| **Charts** | Recharts | 2.12+ | Data visualization |
| **Build Tool** | Nx | 22+ | Monorepo tooling |

### Development Tools

```json
{
  "devDependencies": {
    "@nx/next": "22.0.0",
    "@types/node": "^22.0.0",
    "@types/react": "^18.3.0",
    "autoprefixer": "^10.4.17",
    "eslint": "^9.0.0",
    "eslint-config-next": "14.2.0",
    "postcss": "^8.4.35",
    "prettier": "^3.2.0",
    "tailwindcss": "^3.4.1",
    "typescript": "~5.7.0"
  }
}
```

### Runtime Dependencies

```json
{
  "dependencies": {
    "next": "14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "next-auth": "^5.0.0",
    "@tanstack/react-query": "^5.28.0",
    "zustand": "^4.5.2",
    "react-hook-form": "^7.51.0",
    "zod": "^3.22.4",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-toast": "^1.1.5",
    "lucide-react": "^0.363.0",
    "recharts": "^2.12.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.1",
    "date-fns": "^3.3.1"
  }
}
```

---

## Admin Dashboard Service

### Overview

The Admin Dashboard is an internal application for platform administrators to manage tenants, users, system configuration, and monitor platform health.

### Port & URL

- **Development**: `http://localhost:3002`
- **Production**: `https://admin.gamification-platform.com`

### Authentication

- **Method**: NextAuth.js with JWT
- **Provider**: Credentials (email/password via API Gateway)
- **Authorization**: Role-based (Admin only)
- **Session**: Server-side session with Redis storage

### Page Structure

#### 1. Dashboard (Overview)

**Route**: `/dashboard`

**Purpose**: High-level platform metrics and health overview

```typescript
// apps/admin/src/app/(dashboard)/dashboard/page.tsx
import { Metadata } from 'next';
import { StatsCard, RecentActivity, ServiceHealthWidget } from '@/components/dashboard';

export const metadata: Metadata = {
  title: 'Dashboard - Admin',
  description: 'Platform overview and health metrics',
};

export default async function DashboardPage() {
  // Server component - fetch data at build/request time
  const stats = await fetchPlatformStats();
  const services = await fetchServiceHealth();
  const recentActivity = await fetchRecentActivity();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Platform overview and system health
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Tenants"
          value={stats.totalTenants}
          change="+12.5%"
          trend="up"
        />
        <StatsCard
          title="Active Users"
          value={stats.activeUsers}
          change="+8.2%"
          trend="up"
        />
        <StatsCard
          title="API Requests (24h)"
          value={stats.apiRequests24h}
          change="-2.1%"
          trend="down"
        />
        <StatsCard
          title="System Uptime"
          value="99.97%"
          change="+0.02%"
          trend="up"
        />
      </div>

      {/* Service Health */}
      <ServiceHealthWidget services={services} />

      {/* Recent Activity */}
      <RecentActivity activities={recentActivity} />
    </div>
  );
}

async function fetchPlatformStats() {
  // Fetch from Analytics Service via API Gateway
  const res = await fetch(`${process.env.API_GATEWAY_URL}/analytics/platform-stats`, {
    cache: 'no-store', // Always fresh data
  });
  return res.json();
}
```

**Components**:
- `StatsCard`: Metric display with trend indicator
- `ServiceHealthWidget`: Real-time service health status
- `RecentActivity`: Activity feed (user signups, tenant creation, etc.)

#### 2. Tenant Management

**Route**: `/tenants`

**Purpose**: CRUD operations for tenant accounts

```typescript
// apps/admin/src/app/(dashboard)/tenants/page.tsx
import { TenantTable, CreateTenantDialog } from '@/components/tenants';
import { Button } from '@gamification-api/ui';

export default async function TenantsPage() {
  const tenants = await fetchTenants();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tenants</h1>
          <p className="text-muted-foreground">
            Manage tenant accounts and configurations
          </p>
        </div>
        <CreateTenantDialog />
      </div>

      <TenantTable tenants={tenants} />
    </div>
  );
}
```

**Tenant Table Component**:

```typescript
// apps/admin/src/components/tenants/tenant-table.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@gamification-api/ui';
import { MoreHorizontal, Edit, Trash, Eye } from 'lucide-react';
import { tenantClient } from '@gamification-api/api-client';
import { Tenant } from '@gamification-api/types';

interface TenantTableProps {
  tenants: Tenant[];
}

export function TenantTable({ tenants: initialTenants }: TenantTableProps) {
  const [tenants, setTenants] = useState(initialTenants);
  const router = useRouter();

  const deleteMutation = useMutation({
    mutationFn: (tenantId: string) => tenantClient.delete(tenantId),
    onSuccess: (_, tenantId) => {
      setTenants(prev => prev.filter(t => t.id !== tenantId));
      toast.success('Tenant deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete tenant');
    },
  });

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>API Key</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead>Users</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-[70px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tenants.map((tenant) => (
            <TableRow key={tenant.id}>
              <TableCell className="font-medium">{tenant.name}</TableCell>
              <TableCell className="font-mono text-sm">
                {tenant.apiKey.slice(0, 20)}...
              </TableCell>
              <TableCell>
                <Badge variant={tenant.status === 'active' ? 'default' : 'secondary'}>
                  {tenant.status}
                </Badge>
              </TableCell>
              <TableCell>{tenant.plan}</TableCell>
              <TableCell>{tenant.userCount}</TableCell>
              <TableCell>{formatDate(tenant.createdAt)}</TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => router.push(`/tenants/${tenant.id}`)}>
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push(`/tenants/${tenant.id}/edit`)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => deleteMutation.mutate(tenant.id)}
                    >
                      <Trash className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

**Create Tenant Dialog**:

```typescript
// apps/admin/src/components/tenants/create-tenant-dialog.tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@gamification-api/ui';
import { tenantClient } from '@gamification-api/api-client';
import { Plus } from 'lucide-react';

const tenantSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
  plan: z.enum(['free', 'starter', 'professional', 'enterprise']),
  maxUsers: z.number().min(1).optional(),
});

type TenantFormData = z.infer<typeof tenantSchema>;

export function CreateTenantDialog() {
  const [open, setOpen] = useState(false);

  const form = useForm<TenantFormData>({
    resolver: zodResolver(tenantSchema),
    defaultValues: {
      name: '',
      email: '',
      plan: 'free',
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: TenantFormData) => tenantClient.create(data),
    onSuccess: () => {
      toast.success('Tenant created successfully');
      setOpen(false);
      form.reset();
      router.refresh(); // Refresh server component
    },
    onError: () => {
      toast.error('Failed to create tenant');
    },
  });

  const onSubmit = (data: TenantFormData) => {
    createMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Tenant
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Tenant</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tenant Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Acme Corp" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="admin@acme.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="plan"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plan</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a plan" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="starter">Starter</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create Tenant'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

#### 3. User Management

**Route**: `/users`

**Purpose**: Manage platform users across all tenants

**Features**:
- List all users with filtering (by tenant, role, status)
- User CRUD operations
- Role assignment (admin, user, viewer)
- Account activation/deactivation
- Password reset

```typescript
// apps/admin/src/app/(dashboard)/users/page.tsx
import { UserTable, CreateUserDialog, UserFilters } from '@/components/users';

export default async function UsersPage({
  searchParams,
}: {
  searchParams: { tenant?: string; role?: string; status?: string };
}) {
  const users = await fetchUsers(searchParams);
  const tenants = await fetchTenants();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">
            Manage user accounts and permissions
          </p>
        </div>
        <CreateUserDialog tenants={tenants} />
      </div>

      <UserFilters tenants={tenants} />
      <UserTable users={users} />
    </div>
  );
}
```

#### 4. Analytics Dashboard

**Route**: `/analytics`

**Purpose**: Real-time platform analytics and insights

**Tabs**:
- **Overview**: Key metrics and trends
- **Engagement**: User activity, retention, DAU/MAU
- **Revenue**: MRR, churn, LTV
- **Performance**: API latency, error rates, throughput

```typescript
// apps/admin/src/app/(dashboard)/analytics/page.tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@gamification-api/ui';
import {
  OverviewCharts,
  EngagementCharts,
  RevenueCharts,
  PerformanceCharts,
} from '@/components/analytics';

export default async function AnalyticsPage() {
  const analyticsData = await fetchAnalytics();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">
          Platform metrics and performance insights
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <OverviewCharts data={analyticsData.overview} />
        </TabsContent>

        <TabsContent value="engagement" className="space-y-4">
          <EngagementCharts data={analyticsData.engagement} />
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <RevenueCharts data={analyticsData.revenue} />
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <PerformanceCharts data={analyticsData.performance} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

**Chart Component Example**:

```typescript
// apps/admin/src/components/analytics/overview-charts.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@gamification-api/ui';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface OverviewChartsProps {
  data: {
    userGrowth: Array<{ date: string; users: number }>;
    apiRequests: Array<{ hour: string; requests: number }>;
    tenantDistribution: Array<{ plan: string; count: number }>;
  };
}

export function OverviewCharts({ data }: OverviewChartsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* User Growth Chart */}
      <Card>
        <CardHeader>
          <CardTitle>User Growth (30 days)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data.userGrowth}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="users"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* API Requests Chart */}
      <Card>
        <CardHeader>
          <CardTitle>API Requests (24h)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.apiRequests}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="requests"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Tenant Distribution Chart */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Tenant Distribution by Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.tenantDistribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="plan" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
```

#### 5. Service Health Monitor

**Route**: `/services`

**Purpose**: Monitor microservice health and performance

```typescript
// apps/admin/src/app/(dashboard)/services/page.tsx
import { ServiceCard, ServiceMetrics } from '@/components/services';

export default async function ServicesPage() {
  const services = await fetchServiceHealth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Service Health</h1>
        <p className="text-muted-foreground">
          Microservice status and performance monitoring
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => (
          <ServiceCard key={service.name} service={service} />
        ))}
      </div>

      <ServiceMetrics services={services} />
    </div>
  );
}
```

**Service Card Component**:

```typescript
// apps/admin/src/components/services/service-card.tsx
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@gamification-api/ui';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface ServiceCardProps {
  service: {
    name: string;
    status: 'healthy' | 'degraded' | 'down';
    uptime: number;
    responseTime: number;
    errorRate: number;
  };
}

export function ServiceCard({ service }: ServiceCardProps) {
  const statusConfig = {
    healthy: { icon: CheckCircle, color: 'text-green-500', badge: 'default' },
    degraded: { icon: AlertCircle, color: 'text-yellow-500', badge: 'warning' },
    down: { icon: XCircle, color: 'text-red-500', badge: 'destructive' },
  };

  const config = statusConfig[service.status];
  const Icon = config.icon;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{service.name}</CardTitle>
        <Icon className={`h-4 w-4 ${config.color}`} />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Status</span>
            <Badge variant={config.badge as any}>{service.status}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Uptime</span>
            <span className="text-xs font-medium">{service.uptime}%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Response Time</span>
            <span className="text-xs font-medium">{service.responseTime}ms</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Error Rate</span>
            <span className="text-xs font-medium">{service.errorRate}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

#### 6. Rules Engine Visual Editor

**Route**: `/rules`

**Purpose**: Visual interface for creating and editing gamification rules

**Features**:
- Drag-and-drop rule builder
- Condition/action editor
- Rule testing and simulation
- Version history and rollback

```typescript
// apps/admin/src/app/(dashboard)/rules/page.tsx
import { RuleList, RuleEditor } from '@/components/rules';

export default async function RulesPage() {
  const rules = await fetchRules();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rules Engine</h1>
          <p className="text-muted-foreground">
            Create and manage gamification rules
          </p>
        </div>
        <Button onClick={() => router.push('/rules/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Create Rule
        </Button>
      </div>

      <RuleList rules={rules} />
    </div>
  );
}
```

#### 7. Achievement Configuration

**Route**: `/achievements`

**Purpose**: Configure achievements, badges, and trophies

```typescript
// apps/admin/src/app/(dashboard)/achievements/page.tsx
import { AchievementTable, CreateAchievementDialog } from '@/components/achievements';

export default async function AchievementsPage() {
  const achievements = await fetchAchievements();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Achievements</h1>
          <p className="text-muted-foreground">
            Configure achievements and badges
          </p>
        </div>
        <CreateAchievementDialog />
      </div>

      <AchievementTable achievements={achievements} />
    </div>
  );
}
```

#### 8. Audit Logs

**Route**: `/audit`

**Purpose**: Security and compliance audit trail

```typescript
// apps/admin/src/app/(dashboard)/audit/page.tsx
import { AuditLogTable, AuditFilters } from '@/components/audit';

export default async function AuditPage({
  searchParams,
}: {
  searchParams: { user?: string; action?: string; startDate?: string; endDate?: string };
}) {
  const logs = await fetchAuditLogs(searchParams);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
        <p className="text-muted-foreground">
          Security and compliance audit trail
        </p>
      </div>

      <AuditFilters />
      <AuditLogTable logs={logs} />
    </div>
  );
}
```

### Admin Layout

```typescript
// apps/admin/src/app/(dashboard)/layout.tsx
import { Sidebar, Header } from '@/components/layout';
import { Toaster } from '@gamification-api/ui';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-background p-6">
          {children}
        </main>
      </div>
      <Toaster />
    </div>
  );
}
```

**Sidebar Component**:

```typescript
// apps/admin/src/components/layout/sidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@gamification-api/ui/lib/utils';
import {
  LayoutDashboard,
  Users,
  Building2,
  BarChart3,
  Settings,
  Shield,
  Award,
  Target,
  FileText,
  Activity,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Tenants', href: '/tenants', icon: Building2 },
  { name: 'Users', href: '/users', icon: Users },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Services', href: '/services', icon: Activity },
  { name: 'Rules Engine', href: '/rules', icon: Shield },
  { name: 'Achievements', href: '/achievements', icon: Award },
  { name: 'Rewards', href: '/rewards', icon: Target },
  { name: 'Audit Logs', href: '/audit', icon: FileText },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center border-b px-6">
        <h1 className="text-xl font-bold">Admin Dashboard</h1>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
```

---

## Homepage Service

### Overview

The Homepage is a public-facing application for marketing, user authentication, and personal dashboard for end-users.

### Port & URL

- **Development**: `http://localhost:3001`
- **Production**: `https://gamification-platform.com`

### Page Structure

#### 1. Marketing Landing Page

**Route**: `/` (root)

**Purpose**: Convert visitors to users/customers

```typescript
// apps/homepage/src/app/(marketing)/page.tsx
import { Metadata } from 'next';
import {
  HeroSection,
  FeaturesSection,
  PricingSection,
  TestimonialsSection,
  CTASection,
} from '@/components/marketing';

export const metadata: Metadata = {
  title: 'Gamification Platform - Engage & Retain Users',
  description: 'Enterprise gamification engine to boost engagement and retention',
  openGraph: {
    title: 'Gamification Platform',
    description: 'Boost engagement with achievements, quests, and rewards',
    images: ['/og-image.png'],
  },
};

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <FeaturesSection />
      <PricingSection />
      <TestimonialsSection />
      <CTASection />
    </>
  );
}
```

**Hero Section Component**:

```typescript
// apps/homepage/src/components/marketing/hero-section.tsx
import Link from 'next/link';
import { Button } from '@gamification-api/ui';
import { ArrowRight } from 'lucide-react';

export function HeroSection() {
  return (
    <section className="container flex flex-col items-center gap-8 py-24 md:py-32">
      <div className="flex max-w-[64rem] flex-col items-center gap-4 text-center">
        <h1 className="text-4xl font-bold sm:text-5xl md:text-6xl lg:text-7xl">
          Gamify Your Product,{' '}
          <span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            Engage Your Users
          </span>
        </h1>
        <p className="max-w-[42rem] leading-normal text-muted-foreground sm:text-xl sm:leading-8">
          Enterprise gamification engine with achievements, quests, rewards, and
          leaderboards. Boost engagement by up to 3x with our proven system.
        </p>
        <div className="flex gap-4">
          <Button size="lg" asChild>
            <Link href="/register">
              Get Started Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/docs">View Documentation</Link>
          </Button>
        </div>
      </div>

      {/* Hero Image/Demo */}
      <div className="relative w-full max-w-5xl">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-purple-600/20 blur-3xl" />
        <img
          src="/dashboard-preview.png"
          alt="Dashboard Preview"
          className="relative rounded-lg border shadow-2xl"
        />
      </div>
    </section>
  );
}
```

#### 2. Features Page

**Route**: `/features`

**Purpose**: Detailed feature breakdown

```typescript
// apps/homepage/src/app/(marketing)/features/page.tsx
import { FeatureGrid, FeatureShowcase } from '@/components/marketing';

export const metadata = {
  title: 'Features - Gamification Platform',
};

export default function FeaturesPage() {
  return (
    <div className="container py-12">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-4xl font-bold">Everything You Need to Gamify</h1>
        <p className="mt-4 text-xl text-muted-foreground">
          Comprehensive gamification features for any application
        </p>
      </div>

      <FeatureGrid />
      <FeatureShowcase />
    </div>
  );
}
```

#### 3. Pricing Page

**Route**: `/pricing`

**Purpose**: Pricing tiers and plan comparison

```typescript
// apps/homepage/src/app/(marketing)/pricing/page.tsx
import { PricingCards, PricingComparison, PricingFAQ } from '@/components/pricing';

export default function PricingPage() {
  return (
    <div className="container py-12">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-4xl font-bold">Simple, Transparent Pricing</h1>
        <p className="mt-4 text-xl text-muted-foreground">
          Choose the plan that fits your needs
        </p>
      </div>

      <PricingCards />
      <PricingComparison />
      <PricingFAQ />
    </div>
  );
}
```

**Pricing Cards Component**:

```typescript
// apps/homepage/src/components/pricing/pricing-cards.tsx
import { Button, Card, CardContent, CardHeader, CardTitle, Badge } from '@gamification-api/ui';
import { Check } from 'lucide-react';

const plans = [
  {
    name: 'Free',
    price: '$0',
    description: 'For testing and small projects',
    features: [
      'Up to 100 users',
      'Basic achievements',
      'Community support',
      'API access',
    ],
    cta: 'Get Started',
    popular: false,
  },
  {
    name: 'Starter',
    price: '$99',
    description: 'For growing applications',
    features: [
      'Up to 10,000 users',
      'All gamification features',
      'Email support',
      'Custom branding',
      'Analytics dashboard',
    ],
    cta: 'Start Free Trial',
    popular: true,
  },
  {
    name: 'Professional',
    price: '$299',
    description: 'For established products',
    features: [
      'Up to 100,000 users',
      'Priority support',
      'Advanced analytics',
      'White-label solution',
      'SLA guarantee',
      'Custom integrations',
    ],
    cta: 'Start Free Trial',
    popular: false,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    description: 'For large-scale deployments',
    features: [
      'Unlimited users',
      'Dedicated support',
      'Custom development',
      'On-premise option',
      'Enterprise SLA',
      'Training & onboarding',
    ],
    cta: 'Contact Sales',
    popular: false,
  },
];

export function PricingCards() {
  return (
    <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
      {plans.map((plan) => (
        <Card key={plan.name} className={plan.popular ? 'border-primary' : ''}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{plan.name}</CardTitle>
              {plan.popular && <Badge>Popular</Badge>}
            </div>
            <div className="mt-4">
              <span className="text-4xl font-bold">{plan.price}</span>
              {plan.price !== 'Custom' && <span className="text-muted-foreground">/mo</span>}
            </div>
            <p className="text-sm text-muted-foreground">{plan.description}</p>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
            <Button className="mt-6 w-full" variant={plan.popular ? 'default' : 'outline'}>
              {plan.cta}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

#### 4. Documentation

**Route**: `/docs`

**Purpose**: API documentation and integration guides

```typescript
// apps/homepage/src/app/(marketing)/docs/page.tsx
import { DocsNav, DocsContent } from '@/components/docs';

export default function DocsPage() {
  return (
    <div className="container flex gap-8 py-12">
      <aside className="w-64 shrink-0">
        <DocsNav />
      </aside>
      <main className="flex-1">
        <DocsContent />
      </main>
    </div>
  );
}
```

#### 5. User Dashboard

**Route**: `/dashboard` (authenticated)

**Purpose**: Personal user dashboard showing achievements, quests, rewards

```typescript
// apps/homepage/src/app/(dashboard)/dashboard/page.tsx
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import {
  StatsOverview,
  RecentAchievements,
  ActiveQuests,
  Leaderboard,
} from '@/components/dashboard';

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect('/login');

  const [stats, achievements, quests, leaderboard] = await Promise.all([
    fetchUserStats(session.user.id),
    fetchRecentAchievements(session.user.id),
    fetchActiveQuests(session.user.id),
    fetchLeaderboard(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Welcome back, {session.user.name}!</h1>
        <p className="text-muted-foreground">Here's your progress overview</p>
      </div>

      <StatsOverview stats={stats} />

      <div className="grid gap-6 md:grid-cols-2">
        <RecentAchievements achievements={achievements} />
        <ActiveQuests quests={quests} />
      </div>

      <Leaderboard data={leaderboard} userId={session.user.id} />
    </div>
  );
}
```

**Stats Overview Component**:

```typescript
// apps/homepage/src/components/dashboard/stats-overview.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@gamification-api/ui';
import { Trophy, Target, Star, TrendingUp } from 'lucide-react';

interface StatsOverviewProps {
  stats: {
    totalPoints: number;
    achievementsUnlocked: number;
    questsCompleted: number;
    rank: number;
  };
}

export function StatsOverview({ stats }: StatsOverviewProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Points</CardTitle>
          <Star className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalPoints.toLocaleString()}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Achievements</CardTitle>
          <Trophy className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.achievementsUnlocked}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Quests Completed</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.questsCompleted}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Global Rank</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">#{stats.rank}</div>
        </CardContent>
      </Card>
    </div>
  );
}
```

#### 6. Achievements Page

**Route**: `/achievements`

**Purpose**: Browse and showcase achievements

```typescript
// apps/homepage/src/app/(dashboard)/achievements/page.tsx
import { AchievementGrid, AchievementFilters } from '@/components/achievements';

export default async function AchievementsPage() {
  const session = await auth();
  if (!session) redirect('/login');

  const achievements = await fetchAchievements(session.user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Achievements</h1>
        <p className="text-muted-foreground">
          Track your progress and unlock rewards
        </p>
      </div>

      <AchievementFilters />
      <AchievementGrid achievements={achievements} />
    </div>
  );
}
```

**Achievement Card Component** (from shared library):

```typescript
// libs/ui/src/components/business/achievement-card.tsx
import { Card, CardContent, Badge } from '../ui';
import { Trophy, Lock } from 'lucide-react';

interface AchievementCardProps {
  achievement: {
    id: string;
    name: string;
    description: string;
    icon: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    progress: number;
    unlocked: boolean;
    unlockedAt?: Date;
  };
}

export function AchievementCard({ achievement }: AchievementCardProps) {
  const rarityColors = {
    common: 'bg-gray-500',
    rare: 'bg-blue-500',
    epic: 'bg-purple-500',
    legendary: 'bg-yellow-500',
  };

  return (
    <Card className={achievement.unlocked ? '' : 'opacity-60'}>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div
            className={`flex h-16 w-16 items-center justify-center rounded-lg ${
              achievement.unlocked ? rarityColors[achievement.rarity] : 'bg-muted'
            }`}
          >
            {achievement.unlocked ? (
              <span className="text-3xl">{achievement.icon}</span>
            ) : (
              <Lock className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{achievement.name}</h3>
              <Badge variant="secondary">{achievement.rarity}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {achievement.description}
            </p>
            {!achievement.unlocked && (
              <div className="mt-3">
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span>Progress</span>
                  <span>{achievement.progress}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{ width: `${achievement.progress}%` }}
                  />
                </div>
              </div>
            )}
            {achievement.unlocked && achievement.unlockedAt && (
              <p className="mt-2 text-xs text-muted-foreground">
                Unlocked {formatDate(achievement.unlockedAt)}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

#### 7. Quests Page

**Route**: `/quests`

**Purpose**: View and track quest progress

```typescript
// apps/homepage/src/app/(dashboard)/quests/page.tsx
import { QuestList, QuestFilters } from '@/components/quests';

export default async function QuestsPage() {
  const session = await auth();
  if (!session) redirect('/login');

  const quests = await fetchQuests(session.user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Quests</h1>
        <p className="text-muted-foreground">
          Complete missions and earn rewards
        </p>
      </div>

      <QuestFilters />
      <QuestList quests={quests} />
    </div>
  );
}
```

#### 8. Leaderboard Page

**Route**: `/leaderboard`

**Purpose**: Global and friend leaderboards

```typescript
// apps/homepage/src/app/(dashboard)/leaderboard/page.tsx
import { LeaderboardTable, LeaderboardTabs } from '@/components/leaderboard';

export default async function LeaderboardPage() {
  const session = await auth();
  if (!session) redirect('/login');

  const [global, friends] = await Promise.all([
    fetchGlobalLeaderboard(),
    fetchFriendsLeaderboard(session.user.id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Leaderboard</h1>
        <p className="text-muted-foreground">
          See how you rank against others
        </p>
      </div>

      <LeaderboardTabs global={global} friends={friends} userId={session.user.id} />
    </div>
  );
}
```

#### 9. Rewards Page

**Route**: `/rewards`

**Purpose**: View and redeem rewards

```typescript
// apps/homepage/src/app/(dashboard)/rewards/page.tsx
import { RewardCatalog, UserWallet } from '@/components/rewards';

export default async function RewardsPage() {
  const session = await auth();
  if (!session) redirect('/login');

  const [wallet, rewards] = await Promise.all([
    fetchUserWallet(session.user.id),
    fetchRewardCatalog(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Rewards</h1>
        <p className="text-muted-foreground">
          Redeem your points for exclusive rewards
        </p>
      </div>

      <UserWallet wallet={wallet} />
      <RewardCatalog rewards={rewards} wallet={wallet} />
    </div>
  );
}
```

### Homepage Layout

```typescript
// apps/homepage/src/app/(marketing)/layout.tsx
import { Header, Footer } from '@/components/layout';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
```

```typescript
// apps/homepage/src/app/(dashboard)/layout.tsx
import { DashboardHeader, DashboardSidebar } from '@/components/layout';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen">
      <DashboardSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <DashboardHeader />
        <main className="flex-1 overflow-y-auto bg-background p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

---

## Shared Component Library

### Setup

The shared UI library (`libs/ui`) contains all reusable components based on shadcn/ui.

### Installation Script

```bash
# libs/ui/setup-shadcn.sh
#!/bin/bash

# Initialize shadcn/ui in the shared library
cd libs/ui

# Install shadcn/ui components
npx shadcn-ui@latest init

# Add base components
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add form
npx shadcn-ui@latest add input
npx shadcn-ui@latest add label
npx shadcn-ui@latest add select
npx shadcn-ui@latest add table
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add toast
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add avatar
npx shadcn-ui@latest add checkbox
npx shadcn-ui@latest add radio-group
npx shadcn-ui@latest add switch
npx shadcn-ui@latest add textarea
npx shadcn-ui@latest add popover
npx shadcn-ui@latest add command
npx shadcn-ui@latest add calendar
npx shadcn-ui@latest add sheet
npx shadcn-ui@latest add separator
npx shadcn-ui@latest add skeleton
npx shadcn-ui@latest add slider
npx shadcn-ui@latest add progress
npx shadcn-ui@latest add alert
npx shadcn-ui@latest add alert-dialog
npx shadcn-ui@latest add aspect-ratio
npx shadcn-ui@latest add collapsible
npx shadcn-ui@latest add context-menu
npx shadcn-ui@latest add hover-card
npx shadcn-ui@latest add menubar
npx shadcn-ui@latest add navigation-menu
npx shadcn-ui@latest add scroll-area
npx shadcn-ui@latest add tooltip
```

### Component Exports

```typescript
// libs/ui/src/index.ts

// Base UI Components
export * from './components/ui/button';
export * from './components/ui/card';
export * from './components/ui/dialog';
export * from './components/ui/form';
export * from './components/ui/input';
export * from './components/ui/table';
export * from './components/ui/toast';
export * from './components/ui/badge';
export * from './components/ui/avatar';
export * from './components/ui/select';
export * from './components/ui/tabs';
// ... all other base components

// Business Components
export * from './components/business/achievement-card';
export * from './components/business/leaderboard-table';
export * from './components/business/quest-tracker';
export * from './components/business/reward-card';
export * from './components/business/stats-card';
export * from './components/business/tenant-selector';

// Layout Components
export * from './components/layout/header';
export * from './components/layout/sidebar';
export * from './components/layout/footer';
export * from './components/layout/page-container';

// Utilities
export * from './lib/utils';
```

### Tailwind Configuration (Shared)

```typescript
// libs/ui/tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
```

### Usage in Apps

Both `homepage` and `admin` apps extend the shared Tailwind config:

```typescript
// apps/homepage/tailwind.config.ts
import type { Config } from 'tailwindcss';
import sharedConfig from '../../libs/ui/tailwind.config';

const config: Config = {
  presets: [sharedConfig],
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    '../../libs/ui/src/**/*.{js,ts,jsx,tsx,mdx}', // Include shared components
  ],
};

export default config;
```

---

## Authentication & Authorization

### NextAuth.js Configuration

Both apps use NextAuth.js v5 for authentication.

```typescript
// apps/homepage/src/lib/auth.ts (same for admin)
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { authClient } from '@gamification-api/api-client';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Missing credentials');
        }

        try {
          // Authenticate against API Gateway
          const response = await authClient.login({
            email: credentials.email as string,
            password: credentials.password as string,
          });

          if (response.user && response.accessToken) {
            return {
              id: response.user.id,
              email: response.user.email,
              name: response.user.name,
              role: response.user.role,
              tenantId: response.user.tenantId,
              accessToken: response.accessToken,
            };
          }

          return null;
        } catch (error) {
          console.error('Auth error:', error);
          throw new Error('Invalid credentials');
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.tenantId = user.tenantId;
        token.accessToken = user.accessToken;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.tenantId = token.tenantId as string;
        session.accessToken = token.accessToken as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
});
```

### API Routes

```typescript
// apps/homepage/src/app/api/auth/[...nextauth]/route.ts
export { GET, POST } from '@/lib/auth';
```

### Login Page

```typescript
// apps/homepage/src/app/(auth)/login/page.tsx
'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Button,
} from '@gamification-api/ui';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setError(null);

    const result = await signIn('credentials', {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    if (result?.error) {
      setError('Invalid email or password');
    } else {
      router.push('/dashboard');
      router.refresh();
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Sign In</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="you@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
```

### Protected Routes with Middleware

```typescript
// apps/homepage/src/middleware.ts
export { auth as middleware } from '@/lib/auth';

export const config = {
  matcher: ['/dashboard/:path*', '/achievements/:path*', '/quests/:path*', '/rewards/:path*'],
};
```

### Role-Based Access Control (Admin Only)

```typescript
// apps/admin/src/middleware.ts
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Allow auth routes
  if (pathname.startsWith('/login')) {
    return NextResponse.next();
  }

  // Require admin role for all other routes
  if (req.auth?.user?.role !== 'admin') {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

---

## API Integration

### Shared API Client Library

```typescript
// libs/api-client/src/client/base-client.ts
import { auth } from 'next-auth/react'; // Client-side
import { getServerSession } from 'next-auth'; // Server-side

const API_BASE_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'http://localhost:3000';

export class BaseClient {
  private baseUrl: string;

  constructor(basePath: string = '') {
    this.baseUrl = `${API_BASE_URL}${basePath}`;
  }

  private async getHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Try client-side session first
    if (typeof window !== 'undefined') {
      const session = await auth();
      if (session?.accessToken) {
        headers['Authorization'] = `Bearer ${session.accessToken}`;
      }
    } else {
      // Server-side: get session from request
      const session = await getServerSession();
      if (session?.accessToken) {
        headers['Authorization'] = `Bearer ${session.accessToken}`;
      }
    }

    return headers;
  }

  protected async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers = await this.getHeaders();
    const config: RequestInit = {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    };

    const response = await fetch(`${this.baseUrl}${endpoint}`, config);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  protected get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  protected post<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  protected put<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  protected delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}
```

### Service-Specific Clients

```typescript
// libs/api-client/src/client/achievement-client.ts
import { BaseClient } from './base-client';
import type { Achievement, AchievementProgress } from '@gamification-api/types';

class AchievementClient extends BaseClient {
  constructor() {
    super('/achievements');
  }

  async getAll(userId: string): Promise<Achievement[]> {
    return this.get(`/user/${userId}`);
  }

  async getById(achievementId: string): Promise<Achievement> {
    return this.get(`/${achievementId}`);
  }

  async getProgress(userId: string, achievementId: string): Promise<AchievementProgress> {
    return this.get(`/${achievementId}/progress/${userId}`);
  }

  async unlock(userId: string, achievementId: string): Promise<{ success: boolean }> {
    return this.post(`/${achievementId}/unlock`, { userId });
  }
}

export const achievementClient = new AchievementClient();
```

```typescript
// libs/api-client/src/client/tenant-client.ts
import { BaseClient } from './base-client';
import type { Tenant } from '@gamification-api/types';

class TenantClient extends BaseClient {
  constructor() {
    super('/tenants');
  }

  async getAll(): Promise<Tenant[]> {
    return this.get('/');
  }

  async getById(tenantId: string): Promise<Tenant> {
    return this.get(`/${tenantId}`);
  }

  async create(data: Partial<Tenant>): Promise<Tenant> {
    return this.post('/', data);
  }

  async update(tenantId: string, data: Partial<Tenant>): Promise<Tenant> {
    return this.put(`/${tenantId}`, data);
  }

  async delete(tenantId: string): Promise<{ success: boolean }> {
    return this.delete(`/${tenantId}`);
  }
}

export const tenantClient = new TenantClient();
```

### React Query Integration

```typescript
// libs/hooks/src/use-achievements.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { achievementClient } from '@gamification-api/api-client';
import { useSession } from 'next-auth/react';

export function useAchievements() {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  return useQuery({
    queryKey: ['achievements', userId],
    queryFn: () => achievementClient.getAll(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useAchievement(achievementId: string) {
  return useQuery({
    queryKey: ['achievement', achievementId],
    queryFn: () => achievementClient.getById(achievementId),
    enabled: !!achievementId,
  });
}

export function useUnlockAchievement() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const userId = session?.user?.id;

  return useMutation({
    mutationFn: (achievementId: string) => achievementClient.unlock(userId!, achievementId),
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['achievements', userId] });
    },
  });
}
```

### Query Client Provider

```typescript
// apps/homepage/src/app/providers.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider } from 'next-auth/react';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </SessionProvider>
  );
}
```

```typescript
// apps/homepage/src/app/layout.tsx
import { Providers } from './providers';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

---

## State Management

### React Query for Server State

Used for all API data fetching (achievements, quests, rewards, analytics).

**Benefits**:
- Automatic caching
- Background refetching
- Optimistic updates
- Loading/error states

### Zustand for Client State

Used for UI state (modals, filters, preferences).

```typescript
// apps/homepage/src/lib/stores/ui-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIStore {
  sidebarOpen: boolean;
  theme: 'light' | 'dark' | 'system';
  achievementFilter: 'all' | 'unlocked' | 'locked';
  setSidebarOpen: (open: boolean) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setAchievementFilter: (filter: 'all' | 'unlocked' | 'locked') => void;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      theme: 'system',
      achievementFilter: 'all',
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setTheme: (theme) => set({ theme }),
      setAchievementFilter: (filter) => set({ achievementFilter: filter }),
    }),
    {
      name: 'ui-storage',
    }
  )
);
```

**Usage**:

```typescript
// In a component
import { useUIStore } from '@/lib/stores/ui-store';

export function ThemeToggle() {
  const { theme, setTheme } = useUIStore();

  return (
    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      Toggle Theme
    </button>
  );
}
```

---

## Styling & Theming

### Tailwind CSS

Both apps use Tailwind CSS with the shared configuration from `libs/ui`.

### Dark Mode

```typescript
// apps/homepage/src/app/layout.tsx
import { ThemeProvider } from 'next-themes';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <Providers>{children}</Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

### CSS Variables

```css
/* apps/homepage/src/app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 221.2 83.2% 53.3%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 217.2 91.2% 59.8%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 224.3 76.3% 48%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

---

## Development Setup

### Prerequisites

- Node.js 22+ LTS
- npm 10+
- Nx CLI: `npm install -g nx`

### Initial Setup

```bash
# Install dependencies
npm install

# Generate Next.js apps
nx g @nx/next:app homepage --directory=apps/homepage --style=css --app-router=true
nx g @nx/next:app admin --directory=apps/admin --style=css --app-router=true

# Generate shared libraries
nx g @nx/js:lib ui --directory=libs/ui --publishable
nx g @nx/js:lib api-client --directory=libs/api-client
nx g @nx/js:lib types --directory=libs/types
nx g @nx/js:lib hooks --directory=libs/hooks

# Install dependencies for shared library
cd libs/ui && npm install tailwindcss postcss autoprefixer tailwindcss-animate class-variance-authority clsx tailwind-merge
cd libs/ui && npx tailwindcss init -p

# Install shadcn/ui
cd libs/ui && npx shadcn-ui@latest init

# Install Next.js app dependencies
cd apps/homepage && npm install next-auth@beta @tanstack/react-query zustand react-hook-form zod @hookform/resolvers/zod date-fns lucide-react recharts next-themes
cd apps/admin && npm install next-auth@beta @tanstack/react-query zustand react-hook-form zod @hookform/resolvers/zod date-fns lucide-react recharts next-themes

# Install API client dependencies
cd libs/api-client && npm install @gamification-api/types

# Install hooks dependencies
cd libs/hooks && npm install @tanstack/react-query @gamification-api/api-client @gamification-api/types
```

### Environment Variables

```bash
# apps/homepage/.env.local
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=your-secret-here-generate-with-openssl
NEXT_PUBLIC_API_GATEWAY_URL=http://localhost:3000

# apps/admin/.env.local
NEXTAUTH_URL=http://localhost:3002
NEXTAUTH_SECRET=your-secret-here-generate-with-openssl
NEXT_PUBLIC_API_GATEWAY_URL=http://localhost:3000
```

### Run Development Servers

```bash
# Run homepage
nx serve homepage

# Run admin
nx serve admin

# Run both in parallel
nx run-many --target=serve --projects=homepage,admin --parallel

# Run with API Gateway
nx run-many --target=serve --projects=gateway,homepage,admin --parallel
```

### Build

```bash
# Build homepage
nx build homepage

# Build admin
nx build admin

# Build all frontend apps
nx run-many --target=build --projects=homepage,admin

# Build everything (including shared libs)
nx run-many --target=build --all
```

---

## Deployment

### Docker Configuration

#### Homepage Dockerfile

```dockerfile
# apps/homepage/Dockerfile
FROM node:22-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
COPY nx.json ./
COPY apps/homepage/package.json ./apps/homepage/
COPY libs/ui/package.json ./libs/ui/
COPY libs/api-client/package.json ./libs/api-client/
COPY libs/types/package.json ./libs/types/
COPY libs/hooks/package.json ./libs/hooks/

RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build homepage and dependencies
RUN npx nx build homepage --prod

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/dist/apps/homepage/.next/standalone ./
COPY --from=builder /app/dist/apps/homepage/.next/static ./apps/homepage/.next/static
COPY --from=builder /app/dist/apps/homepage/public ./apps/homepage/public

RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3001

ENV PORT 3001
ENV HOSTNAME "0.0.0.0"

CMD ["node", "apps/homepage/server.js"]
```

#### Admin Dockerfile

```dockerfile
# apps/admin/Dockerfile
FROM node:22-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
COPY nx.json ./
COPY apps/admin/package.json ./apps/admin/
COPY libs/ui/package.json ./libs/ui/
COPY libs/api-client/package.json ./libs/api-client/
COPY libs/types/package.json ./libs/types/
COPY libs/hooks/package.json ./libs/hooks/

RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx nx build admin --prod

FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/dist/apps/admin/.next/standalone ./
COPY --from=builder /app/dist/apps/admin/.next/static ./apps/admin/.next/static
COPY --from=builder /app/dist/apps/admin/public ./apps/admin/public

RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3002

ENV PORT 3002
ENV HOSTNAME "0.0.0.0"

CMD ["node", "apps/admin/server.js"]
```

### Docker Compose

```yaml
# docker-compose.frontend.yml
version: '3.8'

services:
  homepage:
    build:
      context: .
      dockerfile: apps/homepage/Dockerfile
    ports:
      - '3001:3001'
    environment:
      - NEXTAUTH_URL=https://gamification-platform.com
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - NEXT_PUBLIC_API_GATEWAY_URL=https://api.gamification-platform.com
    networks:
      - app-network
    restart: unless-stopped

  admin:
    build:
      context: .
      dockerfile: apps/admin/Dockerfile
    ports:
      - '3002:3002'
    environment:
      - NEXTAUTH_URL=https://admin.gamification-platform.com
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - NEXT_PUBLIC_API_GATEWAY_URL=https://api.gamification-platform.com
    networks:
      - app-network
    restart: unless-stopped

networks:
  app-network:
    external: true
```

### Kubernetes Deployment

#### Homepage Deployment

```yaml
# k8s/homepage-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: homepage
  namespace: gamification
spec:
  replicas: 3
  selector:
    matchLabels:
      app: homepage
  template:
    metadata:
      labels:
        app: homepage
    spec:
      containers:
        - name: homepage
          image: gamification/homepage:latest
          ports:
            - containerPort: 3001
          env:
            - name: NEXTAUTH_URL
              value: 'https://gamification-platform.com'
            - name: NEXTAUTH_SECRET
              valueFrom:
                secretKeyRef:
                  name: frontend-secrets
                  key: nextauth-secret
            - name: NEXT_PUBLIC_API_GATEWAY_URL
              value: 'http://gateway:3000'
          resources:
            requests:
              memory: '256Mi'
              cpu: '250m'
            limits:
              memory: '512Mi'
              cpu: '500m'
          livenessProbe:
            httpGet:
              path: /api/health
              port: 3001
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /api/health
              port: 3001
            initialDelaySeconds: 10
            periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: homepage
  namespace: gamification
spec:
  selector:
    app: homepage
  ports:
    - protocol: TCP
      port: 3001
      targetPort: 3001
  type: ClusterIP
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: homepage-hpa
  namespace: gamification
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: homepage
  minReplicas: 3
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

#### Admin Deployment

```yaml
# k8s/admin-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: admin
  namespace: gamification
spec:
  replicas: 2
  selector:
    matchLabels:
      app: admin
  template:
    metadata:
      labels:
        app: admin
    spec:
      containers:
        - name: admin
          image: gamification/admin:latest
          ports:
            - containerPort: 3002
          env:
            - name: NEXTAUTH_URL
              value: 'https://admin.gamification-platform.com'
            - name: NEXTAUTH_SECRET
              valueFrom:
                secretKeyRef:
                  name: frontend-secrets
                  key: nextauth-secret
            - name: NEXT_PUBLIC_API_GATEWAY_URL
              value: 'http://gateway:3000'
          resources:
            requests:
              memory: '256Mi'
              cpu: '250m'
            limits:
              memory: '512Mi'
              cpu: '500m'
          livenessProbe:
            httpGet:
              path: /api/health
              port: 3002
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /api/health
              port: 3002
            initialDelaySeconds: 10
            periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: admin
  namespace: gamification
spec:
  selector:
    app: admin
  ports:
    - protocol: TCP
      port: 3002
      targetPort: 3002
  type: ClusterIP
```

#### Ingress Configuration

```yaml
# k8s/frontend-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: frontend-ingress
  namespace: gamification
  annotations:
    cert-manager.io/cluster-issuer: 'letsencrypt-prod'
    nginx.ingress.kubernetes.io/ssl-redirect: 'true'
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - gamification-platform.com
      secretName: homepage-tls
    - hosts:
        - admin.gamification-platform.com
      secretName: admin-tls
  rules:
    - host: gamification-platform.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: homepage
                port:
                  number: 3001
    - host: admin.gamification-platform.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: admin
                port:
                  number: 3002
```

### CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/frontend-deploy.yml
name: Frontend Deployment

on:
  push:
    branches: [main]
    paths:
      - 'apps/homepage/**'
      - 'apps/admin/**'
      - 'libs/**'

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build apps
        run: |
          npx nx build homepage --prod
          npx nx build admin --prod

      - name: Run tests
        run: |
          npx nx test homepage
          npx nx test admin

      - name: Build Docker images
        run: |
          docker build -t gamification/homepage:${{ github.sha }} -f apps/homepage/Dockerfile .
          docker build -t gamification/admin:${{ github.sha }} -f apps/admin/Dockerfile .
          docker tag gamification/homepage:${{ github.sha }} gamification/homepage:latest
          docker tag gamification/admin:${{ github.sha }} gamification/admin:latest

      - name: Push to registry
        run: |
          echo "${{ secrets.DOCKER_PASSWORD }}" | docker login -u "${{ secrets.DOCKER_USERNAME }}" --password-stdin
          docker push gamification/homepage:${{ github.sha }}
          docker push gamification/homepage:latest
          docker push gamification/admin:${{ github.sha }}
          docker push gamification/admin:latest

      - name: Deploy to Kubernetes
        run: |
          kubectl set image deployment/homepage homepage=gamification/homepage:${{ github.sha }} -n gamification
          kubectl set image deployment/admin admin=gamification/admin:${{ github.sha }} -n gamification
          kubectl rollout status deployment/homepage -n gamification
          kubectl rollout status deployment/admin -n gamification
```

---

## Testing Strategy

### Unit Tests (Jest)

```typescript
// apps/homepage/src/components/dashboard/stats-overview.spec.tsx
import { render, screen } from '@testing-library/react';
import { StatsOverview } from './stats-overview';

describe('StatsOverview', () => {
  const mockStats = {
    totalPoints: 1500,
    achievementsUnlocked: 12,
    questsCompleted: 8,
    rank: 42,
  };

  it('renders all stat cards', () => {
    render(<StatsOverview stats={mockStats} />);

    expect(screen.getByText('1,500')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('#42')).toBeInTheDocument();
  });

  it('displays correct labels', () => {
    render(<StatsOverview stats={mockStats} />);

    expect(screen.getByText('Total Points')).toBeInTheDocument();
    expect(screen.getByText('Achievements')).toBeInTheDocument();
    expect(screen.getByText('Quests Completed')).toBeInTheDocument();
    expect(screen.getByText('Global Rank')).toBeInTheDocument();
  });
});
```

### Integration Tests

```typescript
// apps/homepage/src/app/(dashboard)/dashboard/page.spec.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { SessionProvider } from 'next-auth/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DashboardPage from './page';

const mockSession = {
  user: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
  accessToken: 'mock-token',
};

describe('DashboardPage', () => {
  it('displays user welcome message', async () => {
    const queryClient = new QueryClient();

    render(
      <SessionProvider session={mockSession}>
        <QueryClientProvider client={queryClient}>
          <DashboardPage />
        </QueryClientProvider>
      </SessionProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Welcome back, Test User/i)).toBeInTheDocument();
    });
  });
});
```

### E2E Tests (Playwright)

```typescript
// apps/homepage/e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('user can login', async ({ page }) => {
    await page.goto('http://localhost:3001/login');

    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('http://localhost:3001/dashboard');
    await expect(page.locator('h1')).toContainText('Welcome back');
  });

  test('invalid credentials show error', async ({ page }) => {
    await page.goto('http://localhost:3001/login');

    await page.fill('input[name="email"]', 'invalid@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    await expect(page.locator('.text-destructive')).toContainText('Invalid email or password');
  });
});
```

### Test Scripts

```json
// package.json scripts
{
  "scripts": {
    "test:homepage": "nx test homepage",
    "test:admin": "nx test admin",
    "test:ui": "nx test ui",
    "test:all": "nx run-many --target=test --all",
    "e2e:homepage": "nx e2e homepage-e2e",
    "e2e:admin": "nx e2e admin-e2e",
    "test:coverage": "nx run-many --target=test --all --coverage"
  }
}
```

---

## Performance Optimization

### Next.js Optimization

```typescript
// apps/homepage/next.config.js
const nextConfig = {
  output: 'standalone', // For Docker
  reactStrictMode: true,
  swcMinify: true,

  // Image optimization
  images: {
    domains: ['cdn.gamification-platform.com'],
    formats: ['image/avif', 'image/webp'],
  },

  // Experimental features
  experimental: {
    optimizePackageImports: ['@gamification-api/ui', 'lucide-react'],
  },

  // Headers for caching
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

### Code Splitting

```typescript
// Dynamic imports for heavy components
import dynamic from 'next/dynamic';

const AnalyticsChart = dynamic(() => import('@/components/analytics/chart'), {
  ssr: false,
  loading: () => <Skeleton className="h-[400px]" />,
});

export default function AnalyticsPage() {
  return (
    <div>
      <AnalyticsChart />
    </div>
  );
}
```

### Image Optimization

```typescript
import Image from 'next/image';

<Image
  src="/dashboard-preview.png"
  alt="Dashboard Preview"
  width={1200}
  height={800}
  priority
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
/>
```

### Font Optimization

```typescript
// apps/homepage/src/app/layout.tsx
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
```

### Bundle Analysis

```bash
# Install bundle analyzer
npm install --save-dev @next/bundle-analyzer

# Analyze bundle
ANALYZE=true npm run build
```

---

## Summary

This specification provides a comprehensive guide for implementing two Next.js 14 frontend applications (Homepage and Admin) with shadcn/ui components integrated into the Gamification API platform.

### Key Deliverables

✅ **2 Next.js Applications**:
- Homepage (Port 3001): Public portal + user dashboard
- Admin (Port 3002): Internal management interface

✅ **Shared Component Library**:
- 50+ shadcn/ui base components
- Custom business components (achievements, quests, rewards)
- Consistent design system

✅ **Complete Features**:
- NextAuth.js authentication
- React Query data fetching
- Zustand state management
- Responsive design
- Dark mode support

✅ **Production-Ready**:
- Docker configuration
- Kubernetes deployment
- CI/CD pipeline
- Performance optimization
- Testing strategy

### Next Steps

1. **Generate Nx apps**: Create `homepage` and `admin` apps in monorepo
2. **Setup shared library**: Install shadcn/ui and create component library
3. **Implement authentication**: Configure NextAuth.js with API Gateway
4. **Build core pages**: Implement dashboard, analytics, tenant management
5. **API integration**: Connect to API Gateway with React Query
6. **Testing**: Write unit, integration, and E2E tests
7. **Deployment**: Build Docker images and deploy to Kubernetes

**Estimated Timeline**: 6-8 weeks with 2 frontend engineers.

---

**Document Version**: 1.0
**Created**: 2025-12-07
**Last Updated**: 2025-12-07
**Lines**: 2,400+
**Size**: ~87KB
