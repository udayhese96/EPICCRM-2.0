// Role hierarchy and permissions system
export type UserRole = "admin" | "branch_head" | "cre_team_leader" | "cre" | "ps" | "sales_team_leader" | "team_leader" | "receptionist"

export interface Permission {
  resource: string
  action: "create" | "read" | "update" | "delete" | "manage"
}

// Define role hierarchy (higher roles inherit permissions from lower roles)
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 8,
  branch_head: 7,
  cre_team_leader: 6,
  sales_team_leader: 5,
  team_leader: 4,
  cre: 3,
  ps: 2,
  receptionist: 1,
}

// Define permissions for each role
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    // Full system access
    { resource: "users", action: "manage" },
    { resource: "branches", action: "manage" },
    { resource: "leads", action: "manage" },
    { resource: "reports", action: "manage" },
    { resource: "settings", action: "manage" },
    { resource: "audit_logs", action: "read" },
  ],
  branch_head: [
    // Branch-level management
    { resource: "users", action: "read" },
    { resource: "users", action: "update" }, // Can update users in their branch
    { resource: "leads", action: "manage" }, // Full lead management in their branch
    { resource: "reports", action: "read" }, // Branch reports
    { resource: "branches", action: "read" },
  ],
  cre_team_leader: [
    // CRE Team Leader permissions
    { resource: "qualified_leads", action: "manage" }, // Manage qualified leads
    { resource: "ps_assignment", action: "manage" }, // Assign leads to PS
    { resource: "leads", action: "read" }, // Read all leads
    { resource: "ps_users", action: "read" }, // Read PS users for assignment
    { resource: "branches", action: "read" }, // Read branches
    { resource: "reports", action: "read" }, // Read reports
  ],
  sales_team_leader: [
    // Sales Team Leader permissions
    { resource: "ps_users", action: "read" }, // Read PS users for monitoring
    { resource: "ps_performance", action: "read" }, // Monitor PS performance
    { resource: "leads", action: "read" }, // Read leads assigned to their PS team
    { resource: "reports", action: "read" }, // Read performance reports
    { resource: "branches", action: "read" }, // Read branches
  ],
  team_leader: [
    // Team Leader permissions - analytical oversight of assigned PS teams
    { resource: "ps_users", action: "read" }, // Read assigned PS users
    { resource: "ps_performance", action: "read" }, // Monitor PS performance analytics
    { resource: "leads", action: "read" }, // Read leads from assigned PS team
    { resource: "reports", action: "read" }, // Read comprehensive analytics reports
    { resource: "team_analytics", action: "read" }, // Access team analytics
    { resource: "branches", action: "read" }, // Read branch information
  ],
  cre: [
    // Customer relationship management
    { resource: "leads", action: "create" },
    { resource: "leads", action: "read" },
    { resource: "leads", action: "update" }, // Can update assigned leads
    { resource: "activities", action: "manage" },
  ],
  ps: [
    // Pre-sales activities
    { resource: "leads", action: "read" },
    { resource: "leads", action: "update" }, // Can update assigned leads
    { resource: "activities", action: "manage" },
  ],
  receptionist: [
    // Basic lead entry
    { resource: "leads", action: "create" },
    { resource: "leads", action: "read" }, // Can read leads they created
    { resource: "activities", action: "create" },
  ],
}

// Check if a role has a specific permission
export function hasPermission(
  userRole: UserRole,
  resource: string,
  action: "create" | "read" | "update" | "delete" | "manage",
): boolean {
  const permissions = ROLE_PERMISSIONS[userRole]

  return permissions.some(
    (permission) =>
      permission.resource === resource && (permission.action === action || permission.action === "manage"),
  )
}

// Check if a role has higher or equal hierarchy level
export function hasRoleLevel(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole]
}

// Get all permissions for a role
export function getRolePermissions(userRole: UserRole): Permission[] {
  return ROLE_PERMISSIONS[userRole]
}

// Check if user can access a specific route
export function canAccessRoute(userRole: UserRole, route: string): boolean {
  const routePermissions: Record<string, { resource: string; action: string }> = {
    "/admin/users": { resource: "users", action: "read" },
    "/admin/users/add": { resource: "users", action: "create" },
    "/admin/branches": { resource: "branches", action: "read" },
    "/admin/branches/add": { resource: "branches", action: "create" },
    "/admin/settings": { resource: "settings", action: "read" },
    "/reports": { resource: "reports", action: "read" },
    "/leads": { resource: "leads", action: "read" },
    "/leads/add": { resource: "leads", action: "create" },
  }

  const routePermission = routePermissions[route]
  if (!routePermission) return true // Allow access to routes not in the list

  return hasPermission(userRole, routePermission.resource, routePermission.action as any)
}

// Resource ownership checks
export interface ResourceOwnership {
  userId?: string
  branchId?: string
  createdBy?: string
  assignedTo?: string
}

export function canAccessResource(
  userRole: UserRole,
  userId: string,
  userBranchId: string | null,
  resource: ResourceOwnership,
  action: "create" | "read" | "update" | "delete",
): boolean {
  // Admin can access everything
  if (userRole === "admin") return true

  // Branch heads can access resources in their branch
  if (userRole === "branch_head" && userBranchId) {
    if (resource.branchId === userBranchId) return true
    if (resource.userId && resource.branchId === userBranchId) return true
  }

  // Users can access their own resources
  if (resource.userId === userId) return true
  if (resource.createdBy === userId) return true
  if (resource.assignedTo === userId) return true

  // Check basic role permissions
  return hasPermission(userRole, "leads", action) // Default to leads for now
}
