import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import prisma from "./prisma"
import { Role as PrismaRole, Prisma } from "@prisma/client"
import { Adapter, AdapterAccount } from "next-auth/adapters"

export enum Role {
    USER = 'USER',
    TENANT_ADMIN = 'TENANT_ADMIN',
    SUPER_ADMIN = 'SUPER_ADMIN',
}

interface DbUser {
    id: string;
    email: string | null;
    name: string | null;
    role: PrismaRole;
    tenantId: string | null;
    tenant: {
        id: string;
        name: string;
        isActive: boolean;
    } | null;
}

declare module "next-auth" {
    interface Session {
        user: {
            id: string
            name?: string | null
            email?: string | null
            image?: string | null
            role: Role
            tenantId?: string | null
        }
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string
        role: Role
        tenantId?: string | null
    }
}

export const authOptions: NextAuthOptions = {
    adapter: {
        ...PrismaAdapter(prisma),
        linkAccount: async (data: AdapterAccount) => {
            console.log('Linking account:', data);
            const account = await prisma.account.create({
                data: {
                    userId: data.userId,
                    type: data.type,
                    provider: data.provider,
                    providerAccountId: data.providerAccountId,
                    refresh_token: data.refresh_token,
                    access_token: data.access_token,
                    expires_at: data.expires_at,
                    token_type: data.token_type,
                    scope: data.scope,
                    id_token: data.id_token,
                    session_state: data.session_state
                }
            });
            console.log('Account linked successfully:', account.id);
            return account;
        },
        createUser: async (data: Prisma.UserCreateInput) => {
            console.log('Creating user:', data);
            const user = await prisma.user.create({ data });
            console.log('User created:', user.id);
            return user;
        },
        getUser: async (id) => {
            console.log('Getting user by id:', id);
            const user = await prisma.user.findUnique({ where: { id } });
            console.log('Found user:', user?.id);
            return user;
        },
        getUserByEmail: async (email) => {
            console.log('Getting user by email:', email);
            const user = await prisma.user.findUnique({ where: { email } });
            console.log('Found user:', user?.id);
            return user;
        },
        getUserByAccount: async ({ providerAccountId, provider }) => {
            console.log('Getting user by account:', { providerAccountId, provider });
            const account = await prisma.account.findUnique({
                where: {
                    provider_providerAccountId: {
                        provider,
                        providerAccountId,
                    },
                },
                include: { user: true },
            });
            console.log('Found user by account:', account?.user?.id);
            return account?.user ?? null;
        }
    } as Adapter,
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            authorization: {
                params: {
                    prompt: "select_account",
                    access_type: "offline",
                    response_type: "code"
                }
            }
        }),
    ],
    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    callbacks: {
        async jwt({ token, user, trigger, session }) {
            // Always fetch the latest user data from database to ensure role/tenantId are up-to-date
            // This is important when roles change (e.g., super admin assigned to tenant)
            let dbUser = null
            
            // Try to fetch user by email first
            const email = user?.email || token.email
            if (email) {
                dbUser = await prisma.user.findUnique({
                    where: { email },
                    select: {
                        id: true,
                        role: true,
                        tenantId: true,
                        tenant: {
                            select: {
                                isActive: true
                            }
                        }
                    }
                })
            }
            
            // If not found by email, try by user ID (from token or user object)
            if (!dbUser && (token.id || user?.id)) {
                const userId = token.id || user?.id
                dbUser = await prisma.user.findUnique({
                    where: { id: userId },
                    select: {
                        id: true,
                        role: true,
                        tenantId: true,
                        tenant: {
                            select: {
                                isActive: true
                            }
                        }
                    }
                })
            }

                if (dbUser) {
                    token.id = dbUser.id
                    token.role = dbUser.role as unknown as Role
                    token.tenantId = dbUser.tenantId
                
                // Debug logging in development
                if (process.env.NODE_ENV === 'development') {
                    console.log('JWT Callback - User fetched:', {
                        id: dbUser.id,
                        email: email || 'not available',
                        role: dbUser.role,
                        tenantId: dbUser.tenantId
                    })
                }
            } else if (user) {
                // Only set default role on initial sign-in if user doesn't exist in DB
                token.id = user.id
                    token.role = Role.USER
                }

            // Handle manual session updates (overrides database fetch)
            if (trigger === "update" && session) {
                if (session.user?.role) token.role = session.user.role
                if (session.user?.tenantId !== undefined) token.tenantId = session.user.tenantId
            }

            return token
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id
                session.user.role = token.role
                session.user.tenantId = token.tenantId
            }

            // Debug logging in development
            if (process.env.NODE_ENV === 'development') {
                console.log('Session Callback - Final Session:', { 
                    userId: session.user?.id,
                    email: session.user?.email,
                    role: session.user?.role,
                    tenantId: session.user?.tenantId,
                    tokenTenantId: token.tenantId
                })
            }

            return session
        },
        async signIn({ user, account, profile }) {
            try {
                console.log('SignIn Callback Started:', { 
                    email: user.email,
                    provider: account?.provider,
                    hasProfile: !!profile
                });

                if (!account?.provider || !user.email) {
                    console.error('Sign-in error: Missing provider or email', { account, user });
                    return '/auth/login-error?error=Default'
                }

                const dbUser = await prisma.user.findUnique({
                    where: { email: user.email },
                    include: { 
                        tenant: true,
                        accounts: {
                            where: {
                                provider: account.provider
                            }
                        }
                    }
                });

                console.log('Database User Check:', {
                    exists: !!dbUser,
                    email: dbUser?.email,
                    role: dbUser?.role,
                    tenantId: dbUser?.tenantId,
                    hasAccounts: dbUser?.accounts?.length
                });

                if (!dbUser) {
                    console.log('Sign-in error: User not found', { email: user.email });
                    return '/auth/login-error?error=UserNotFound'
                }

                // Check if user is active
                if (!dbUser.isActive) {
                    console.log('Sign-in error: User is inactive', { email: user.email });
                    return '/auth/login-error?error=UserInactive'
                }

                // Create account if it doesn't exist
                if (dbUser.accounts.length === 0 && account) {
                    try {
                        await prisma.account.create({
                            data: {
                                userId: dbUser.id,
                                type: account.type,
                                provider: account.provider,
                                providerAccountId: account.providerAccountId,
                                refresh_token: account.refresh_token,
                                access_token: account.access_token,
                                expires_at: account.expires_at,
                                token_type: account.token_type,
                                scope: account.scope,
                                id_token: account.id_token,
                                session_state: account.session_state
                            }
                        });
                        console.log('Created account for user:', dbUser.email);
                    } catch (error) {
                        console.error('Error creating account:', error);
                        // Continue with sign in even if account creation fails
                    }
                }

                // Super admins can always sign in
                if (dbUser.role === PrismaRole.SUPER_ADMIN) {
                    console.log('Super admin login approved');
                    return true
                }

                // For tenant users (both regular users and tenant admins), check if tenant exists and is active
                if (dbUser.tenantId) {
                    const tenant = await prisma.tenant.findUnique({
                        where: { id: dbUser.tenantId },
                        select: { isActive: true }
                    })

                    console.log('Tenant Check:', {
                        tenantId: dbUser.tenantId,
                        exists: !!tenant,
                        isActive: tenant?.isActive
                    });

                    if (!tenant || !tenant.isActive) {
                        console.error('Sign-in error: Inactive tenant', { tenantId: dbUser.tenantId });
                        return '/auth/login-error?error=InactiveTenant'
                    }
                }

                console.log('Sign-in approved for user:', user.email);
                return true
            } catch (error) {
                console.error('Sign-in error:', error)
                return '/auth/login-error?error=Default'
            }
        }
    },
    pages: {
        signIn: '/auth/login',
        error: '/auth/login-error'
    },
    secret: process.env.NEXTAUTH_SECRET,
    debug: process.env.NODE_ENV === 'development',
}
