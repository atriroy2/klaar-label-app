'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Role } from '@/lib/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Loader2, RefreshCw, UserPlus, Pencil, Power, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

type User = {
    id: string
    name: string | null
    email: string | null
    role: string
    isActive?: boolean
}

type SortColumn = 'name' | 'email' | 'role' | 'status'
type SortDirection = 'asc' | 'desc'

export default function UserListPage() {
    const { data: session, status: sessionStatus } = useSession()
    const router = useRouter()
    const [users, setUsers] = useState<User[]>([])
    const [filteredUsers, setFilteredUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [isAddUserOpen, setIsAddUserOpen] = useState(false)
    const [isEditUserOpen, setIsEditUserOpen] = useState(false)
    const [selectedUser, setSelectedUser] = useState<User | null>(null)
    const [sortColumn, setSortColumn] = useState<SortColumn | null>(null)
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
    const [newUserRole, setNewUserRole] = useState<string>('USER')
    const { toast } = useToast()

    // Wait for session to load before checking permissions
    useEffect(() => {
        // Don't redirect while session is loading
        if (sessionStatus === 'loading') {
            return
        }

        // If session is loaded, check permissions
        if (sessionStatus === 'authenticated' && session?.user) {
            const isTenantAdmin = session.user.role === Role.TENANT_ADMIN
            const isSuperAdminWithTenant = session.user.role === Role.SUPER_ADMIN && session.user.tenantId
            
            console.log('UserListPage - Permission Check:', {
                role: session.user.role,
                tenantId: session.user.tenantId,
                isTenantAdmin,
                isSuperAdminWithTenant,
                hasAccess: isTenantAdmin || isSuperAdminWithTenant
            })

            if (!isTenantAdmin && !isSuperAdminWithTenant) {
                console.log('UserListPage - Redirecting: No access')
            router.push('/dashboard')
        }
        } else if (sessionStatus === 'unauthenticated') {
            router.push('/login')
        }
    }, [session, sessionStatus, router])

    useEffect(() => {
        // Only fetch users if session is authenticated and user has permission
        if (sessionStatus === 'authenticated' && session?.user) {
            const isTenantAdmin = session.user.role === Role.TENANT_ADMIN
            const isSuperAdminWithTenant = session.user.role === Role.SUPER_ADMIN && session.user.tenantId
            if (isTenantAdmin || isSuperAdminWithTenant) {
            fetchUsers()
        }
        }
    }, [session, sessionStatus])

    const applyFiltersAndSort = () => {
        let filtered = [...users]

        if (statusFilter === 'active') {
            filtered = filtered.filter(u => u.isActive !== false)
        } else if (statusFilter === 'inactive') {
            filtered = filtered.filter(u => u.isActive === false)
        }

        if (sortColumn) {
            filtered.sort((a, b) => {
                let aValue: any
                let bValue: any

                switch (sortColumn) {
                    case 'name':
                        aValue = a.name || a.email || ''
                        bValue = b.name || b.email || ''
                        break
                    case 'email':
                        aValue = a.email || ''
                        bValue = b.email || ''
                        break
                    case 'role':
                        aValue = a.role || ''
                        bValue = b.role || ''
                        break
                    case 'status':
                        aValue = a.isActive !== false ? 'Active' : 'Inactive'
                        bValue = b.isActive !== false ? 'Active' : 'Inactive'
                        break
                    default:
                        return 0
                }

                if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
                if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
                return 0
            })
        }

        setFilteredUsers(filtered)
    }

    const handleSort = (column: SortColumn) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
        } else {
            setSortColumn(column)
            setSortDirection('asc')
        }
    }

    const SortIcon = ({ column }: { column: SortColumn }) => {
        if (sortColumn !== column) {
            return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />
        }
        return sortDirection === 'asc' 
            ? <ArrowUp className="h-4 w-4 ml-1" />
            : <ArrowDown className="h-4 w-4 ml-1" />
    }

    useEffect(() => {
        applyFiltersAndSort()
    }, [users, statusFilter, sortColumn, sortDirection])

    const fetchUsers = async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/users')
            if (!response.ok) throw new Error('Failed to fetch users')
            const data = await response.json()
            setUsers(data)
            setFilteredUsers(data)
        } catch (error) {
            console.error('Error fetching users:', error)
            toast({
                title: "Error",
                description: "Failed to load users",
                variant: "destructive",
            })
        } finally {
            setLoading(false)
        }
    }

    const handleAddUser = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        const formData = new FormData(event.currentTarget)
        const userData: any = {
            name: formData.get('name'),
            email: formData.get('email'),
            role: newUserRole,
        }

        try {
            const response = await fetch('/api/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData),
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: response.statusText }))
                throw new Error(errorData.error || errorData.message || `Failed to create user: ${response.status} ${response.statusText}`)
            }

            await fetchUsers()
            setIsAddUserOpen(false)
            setNewUserRole('USER')
            toast({
                title: "Success",
                description: "User created successfully",
            })
        } catch (error: any) {
            console.error('Error creating user:', error)
            toast({
                title: "Error",
                description: error.message || "Failed to create user",
                variant: "destructive",
            })
        }
    }

    const handleEditUser = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (!selectedUser) return

        const formData = new FormData(event.currentTarget)
        const userData: any = {
            id: selectedUser.id,
            name: formData.get('name'),
            email: formData.get('email'),
            role: formData.get('role'),
        }

        try {
            const response = await fetch('/api/users', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData),
            })

            if (!response.ok) {
                throw new Error('Failed to update user')
            }

            await fetchUsers()
            setIsEditUserOpen(false)
            setSelectedUser(null)
            toast({
                title: "Success",
                description: "User updated successfully",
            })
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to update user",
                variant: "destructive",
            })
        }
    }

    const handleToggleStatus = async (user: User) => {
        try {
            const response = await fetch('/api/users', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id: user.id,
                    isActive: !user.isActive,
                }),
            })

            if (!response.ok) {
                const errorText = await response.text()
                if (errorText === 'Cannot deactivate the only Tenant Admin') {
                    toast({
                        title: "Error",
                        description: "Cannot deactivate the only Tenant Admin in the organization",
                        variant: "destructive",
                    })
                    return
                }
                throw new Error('Failed to toggle user status')
            }

            await fetchUsers()
            toast({
                title: "Success",
                description: `User ${user.isActive ? 'deactivated' : 'activated'} successfully`,
            })
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to toggle user status",
                variant: "destructive",
            })
        }
    }

    // Show loading state while session is loading
    if (sessionStatus === 'loading') {
    return (
            <div className="flex items-center justify-center min-h-screen">
                            <div className="flex flex-col items-center gap-2">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Loading...</p>
                            </div>
        </div>
    )
}

    // Check if user has access
    const isTenantAdmin = session?.user?.role === Role.TENANT_ADMIN
    const isSuperAdminWithTenant = session?.user?.role === Role.SUPER_ADMIN && session?.user?.tenantId
    const hasAccess = isTenantAdmin || isSuperAdminWithTenant

    // If no access, return null (redirect will happen in useEffect)
    if (!hasAccess) {
        return null
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-xl font-semibold">User List</h1>
                <div className="flex items-center gap-2">
                    <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
                        <DialogTrigger asChild>
                            <Button variant="default">
                                <UserPlus className="h-4 w-4 mr-2" />
                                Add User
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add New User</DialogTitle>
                                <DialogDescription>
                                    Add a new user to your organization.
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleAddUser} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Name</Label>
                                    <Input id="name" name="name" placeholder="John Doe" required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input id="email" name="email" type="email" placeholder="john@example.com" required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="role">Role</Label>
                                    <Select name="role" value={newUserRole} onValueChange={setNewUserRole} required>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select role" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="USER">User</SelectItem>
                                            <SelectItem value="TENANT_ADMIN">Admin</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex justify-end gap-2">
                                    <Button type="button" variant="outline" onClick={() => setIsAddUserOpen(false)}>
                                        Cancel
                                    </Button>
                                    <Button type="submit">
                                        Add User
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={fetchUsers}
                        disabled={loading}
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        <span className="sr-only">Refresh user list</span>
                    </Button>
                </div>
            </div>

            <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit User</DialogTitle>
                        <DialogDescription>
                            Update user information
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleEditUser} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-name">Name</Label>
                            <Input
                                id="edit-name"
                                name="name"
                                placeholder="John Doe"
                                defaultValue={selectedUser?.name || ''}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-email">Email</Label>
                            <Input
                                id="edit-email"
                                name="email"
                                type="email"
                                placeholder="john@example.com"
                                defaultValue={selectedUser?.email || ''}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-role">Role</Label>
                            <Select name="role" defaultValue={selectedUser?.role || 'USER'}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="USER">User</SelectItem>
                                    <SelectItem value="TENANT_ADMIN">Admin</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => {
                                setIsEditUserOpen(false)
                                setSelectedUser(null)
                            }}>
                                Cancel
                            </Button>
                            <Button type="submit">
                                Save Changes
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            <Card>
                <CardHeader>
                    <CardTitle>Users</CardTitle>
                    <CardDescription>
                        Manage users in your organization
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="mb-4 flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Label htmlFor="status-filter">Filter:</Label>
                            <Select value={statusFilter} onValueChange={(value: 'all' | 'active' | 'inactive') => setStatusFilter(value)}>
                                <SelectTrigger id="status-filter" className="w-[150px]">
                                    <SelectValue placeholder="All Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="active">Active Only</SelectItem>
                                    <SelectItem value="inactive">Inactive Only</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="flex flex-col items-center gap-2">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                <p className="text-sm text-muted-foreground">Loading users...</p>
                            </div>
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                            <p className="text-lg font-medium">No users found</p>
                            <p className="text-sm text-muted-foreground">Users in your organization will appear here.</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>
                                        <Button
                                            variant="ghost"
                                            onClick={() => handleSort('name')}
                                            className="h-8 px-2 hover:bg-transparent"
                                        >
                                            Name
                                            <SortIcon column="name" />
                                        </Button>
                                    </TableHead>
                                    <TableHead>
                                        <Button
                                            variant="ghost"
                                            onClick={() => handleSort('email')}
                                            className="h-8 px-2 hover:bg-transparent"
                                        >
                                            Email
                                            <SortIcon column="email" />
                                        </Button>
                                    </TableHead>
                                    <TableHead>
                                        <Button
                                            variant="ghost"
                                            onClick={() => handleSort('role')}
                                            className="h-8 px-2 hover:bg-transparent"
                                        >
                                            Role
                                            <SortIcon column="role" />
                                        </Button>
                                    </TableHead>
                                    <TableHead>
                                        <Button
                                            variant="ghost"
                                            onClick={() => handleSort('status')}
                                            className="h-8 px-2 hover:bg-transparent"
                                        >
                                            Status
                                            <SortIcon column="status" />
                                        </Button>
                                    </TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredUsers.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">{user.name || '-'}</TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell>{user.role}</TableCell>
                                        <TableCell>
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                user.isActive
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                            }`}>
                                                {user.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() => {
                                                        setSelectedUser(user)
                                                        setIsEditUserOpen(true)
                                                    }}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                    <span className="sr-only">Edit user</span>
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() => handleToggleStatus(user)}
                                                    className={user.isActive ? "text-amber-600" : "text-green-600"}
                                                >
                                                    <Power className="h-4 w-4" />
                                                    <span className="sr-only">
                                                        {user.isActive ? 'Deactivate' : 'Activate'} user
                                                    </span>
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    )
} 