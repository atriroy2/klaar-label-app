'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState, useEffect } from 'react'
import { Building2, Loader2, Power, Trash2, RefreshCw, X, ChevronDown, UserCircle2 } from 'lucide-react'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/components/ui/use-toast"

type Tenant = {
    id: string
    name: string
    domain: string | null
    isActive: boolean
    adminEmail: string
    userCount: number
    createdAt: string
}

export default function SuperAdminPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [tenantsLoading, setTenantsLoading] = useState(true)
    const [tenants, setTenants] = useState<Tenant[]>([])
    const [isFormVisible, setIsFormVisible] = useState(true)
    const { toast } = useToast()
    const [formData, setFormData] = useState({
        name: '',
        domain: '',
        adminEmail: '',
        adminName: ''
    })
    const [isUserView, setIsUserView] = useState(false)

    // Debug session data
    useEffect(() => {
        console.log('SuperAdmin Page - Session:', {
            session,
            status,
            userRole: session?.user?.role,
            userId: session?.user?.id,
            userEmail: session?.user?.email
        })
    }, [session, status])

    // Fetch tenants with error logging
    useEffect(() => {
        const fetchTenants = async () => {
            try {
                setTenantsLoading(true)
                const response = await fetch('/api/tenants')
                if (response.ok) {
                    const data = await response.json()
                    setTenants(data)
                }
            } catch (error) {
                toast({
                    title: "Error",
                    description: "Failed to fetch tenants",
                    variant: "destructive",
                })
            } finally {
                setTenantsLoading(false)
            }
        }
        fetchTenants()
    }, [toast])

    // Redirect if not super admin
    if (status === 'loading') {
        return <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    }

    if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
        router.push('/dashboard')
        return null
    }

    if (isUserView) {
        router.push('/dashboard')
        return null
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const response = await fetch('/api/tenants', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error)
            }

            // Reset form
            setFormData({
                name: '',
                domain: '',
                adminEmail: '',
                adminName: ''
            })

            // Refresh tenants list
            const tenantsResponse = await fetch('/api/tenants')
            if (tenantsResponse.ok) {
                const tenantsData = await tenantsResponse.json()
                setTenants(tenantsData)
            }

            toast({
                title: "Success",
                description: "Tenant created successfully",
                variant: "default",
                duration: 3000,
            })
        } catch (error: any) {
            toast({
                title: "Creation Failed",
                description: error.message,
                variant: "destructive",
                duration: 5000,
            })
        } finally {
            setLoading(false)
        }
    }

    const toggleTenantStatus = async (tenantId: string, currentStatus: boolean) => {
        try {
            const response = await fetch(`/api/tenants/${tenantId}/toggle-status`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ isActive: !currentStatus }),
            })

            if (!response.ok) throw new Error('Failed to update tenant status')

            // Update local state
            setTenants(tenants.map(tenant =>
                tenant.id === tenantId
                    ? { ...tenant, isActive: !tenant.isActive }
                    : tenant
            ))

            toast({
                title: "Success",
                description: `Tenant ${currentStatus ? 'deactivated' : 'activated'} successfully`,
                variant: "default",
                duration: 3000,
            })
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to update tenant status",
                variant: "destructive",
                duration: 5000,
            })
        }
    }

    const deleteTenant = async (tenantId: string) => {
        try {
            const response = await fetch(`/api/tenants/${tenantId}`, {
                method: 'DELETE',
            })

            if (!response.ok) throw new Error('Failed to delete tenant')

            // Update local state
            setTenants(tenants.filter(tenant => tenant.id !== tenantId))

            toast({
                title: "Success",
                description: "Tenant deleted successfully",
                variant: "default",
                duration: 3000,
            })
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to delete tenant",
                variant: "destructive",
                duration: 5000,
            })
        }
    }

    const refreshTenants = async () => {
        try {
            setTenantsLoading(true)
            const response = await fetch('/api/tenants')
            if (response.ok) {
                const data = await response.json()
                setTenants(data)
                toast({
                    title: "Refreshed",
                    description: "Tenant list updated",
                    variant: "default",
                    duration: 2000,
                })
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to refresh tenants",
                variant: "destructive",
            })
        } finally {
            setTenantsLoading(false)
        }
    }

    const clearForm = () => {
        setFormData({
            name: '',
            domain: '',
            adminEmail: '',
            adminName: ''
        })
        toast({
            title: "Form Cleared",
            description: "All fields have been reset",
            duration: 2000,
        })
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Super Admin Dashboard</h1>
                <Button
                    variant="outline"
                    onClick={() => setIsUserView(true)}
                    className="gap-2"
                >
                    <UserCircle2 className="h-4 w-4" />
                    Switch to User View
                </Button>
            </div>

            <Card>
                <CardHeader
                    className="flex flex-row items-center justify-between space-y-0 pb-4 cursor-pointer select-none"
                    onClick={() => setIsFormVisible(!isFormVisible)}
                >
                    <div className="flex items-center gap-2">
                        <ChevronDown
                            className={`h-5 w-5 transition-transform text-muted-foreground ${isFormVisible ? 'transform rotate-180' : ''}`}
                        />
                        <div className="flex items-center gap-2">
                            <Building2 className="h-6 w-6" />
                            <div>
                                <CardTitle>
                                    Create New Tenant
                                </CardTitle>
                                <CardDescription>
                                    Add a new customer tenant to the platform
                                </CardDescription>
                            </div>
                        </div>
                    </div>
                    {isFormVisible && (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation()
                                clearForm()
                            }}
                            className="gap-2 transition-opacity duration-200"
                        >
                            <X className="h-4 w-4" />
                            Clear Form
                        </Button>
                    )}
                </CardHeader>
                <div className={`transition-all duration-300 ease-in-out ${isFormVisible ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Tenant Name</Label>
                                    <Input
                                        id="name"
                                        placeholder="Acme Corp"
                                        value={formData.name}
                                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="domain">Domain (optional)</Label>
                                    <Input
                                        id="domain"
                                        placeholder="acme.com"
                                        value={formData.domain}
                                        onChange={(e) => setFormData(prev => ({ ...prev, domain: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="adminName">Admin Name</Label>
                                    <Input
                                        id="adminName"
                                        placeholder="John Doe"
                                        value={formData.adminName}
                                        onChange={(e) => setFormData(prev => ({ ...prev, adminName: e.target.value }))}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="adminEmail">Admin Email</Label>
                                    <Input
                                        id="adminEmail"
                                        type="email"
                                        placeholder="admin@acme.com"
                                        value={formData.adminEmail}
                                        onChange={(e) => setFormData(prev => ({ ...prev, adminEmail: e.target.value }))}
                                        required
                                    />
                                </div>
                            </div>
                            <Button type="submit" disabled={loading} className="w-full">
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Creating Tenant...
                                    </>
                                ) : (
                                    'Create Tenant'
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </div>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <div>
                        <CardTitle>Manage Tenants</CardTitle>
                        <CardDescription>View and manage all tenants in the platform</CardDescription>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={refreshTenants}
                        disabled={tenantsLoading}
                        className="h-9 w-9 p-0"
                    >
                        <RefreshCw className={`h-4 w-4 ${tenantsLoading ? 'animate-spin' : ''}`} />
                    </Button>
                </CardHeader>
                <CardContent>
                    {tenantsLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="flex flex-col items-center gap-2">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                <p className="text-sm text-muted-foreground">Loading tenants...</p>
                            </div>
                        </div>
                    ) : tenants.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                            <Building2 className="h-8 w-8 text-muted-foreground mb-2" />
                            <p className="text-lg font-medium">No tenants found</p>
                            <p className="text-sm text-muted-foreground">Create your first tenant using the form above.</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Domain</TableHead>
                                    <TableHead>Admin Email</TableHead>
                                    <TableHead>Users</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Created At</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {tenants.map((tenant) => (
                                    <TableRow key={tenant.id}>
                                        <TableCell className="font-medium">{tenant.name}</TableCell>
                                        <TableCell>{tenant.domain || '-'}</TableCell>
                                        <TableCell>{tenant.adminEmail}</TableCell>
                                        <TableCell>{tenant.userCount}</TableCell>
                                        <TableCell>
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${tenant.isActive
                                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                                }`}>
                                                {tenant.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </TableCell>
                                        <TableCell>{new Date(tenant.createdAt).toLocaleDateString()}</TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className={tenant.isActive ? "text-amber-600" : "text-green-600"}
                                                    >
                                                        <Power className="h-4 w-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>
                                                            {tenant.isActive ? 'Deactivate' : 'Activate'} Tenant
                                                        </AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Are you sure you want to {tenant.isActive ? 'deactivate' : 'activate'} {tenant.name}?
                                                            {tenant.isActive && " This will prevent all users from logging in."}
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction
                                                            onClick={() => toggleTenantStatus(tenant.id, tenant.isActive)}
                                                            className={tenant.isActive ? "bg-amber-600" : "bg-green-600"}
                                                        >
                                                            {tenant.isActive ? 'Deactivate' : 'Activate'}
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>

                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-red-600"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Delete Tenant</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Are you sure you want to delete {tenant.name}? This action cannot be undone.
                                                            All users associated with this tenant will lose access.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction
                                                            onClick={() => deleteTenant(tenant.id)}
                                                            className="bg-red-600"
                                                        >
                                                            Delete
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
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