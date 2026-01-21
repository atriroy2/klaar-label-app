import { Button } from "@/components/ui/button";
import { signOut, useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { CheckSquare, Home, Users } from "lucide-react";

const navigationItems = [
  {
    title: 'Home',
    href: '/',
    icon: Home,
  },
  {
    title: 'Todo List',
    href: '/todo-list',
    icon: CheckSquare,
  },
  {
    title: 'Users',
    href: '/users',
    icon: Users,
    adminOnly: true,
  },
];

export function MenuBar() {
  const { data: session } = useSession();
  const pathname = usePathname();

  // Function to get page name from pathname
  const getPageName = (path: string) => {
    if (path === "/") return "Home";
    return path.slice(1).charAt(0).toUpperCase() + path.slice(2);
  };

  // Filter navigation items based on user role
  const filteredNavItems = navigationItems.filter(
    item => !item.adminOnly || session?.user?.role === 'SUPER_ADMIN'
  );

  return (
    <div className="border-b">
      <div className="flex h-16 items-center px-4">
        {/* Left section - Navigation */}
        <nav className="flex items-center space-x-4 lg:space-x-6 mx-6">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm font-medium transition-colors hover:text-primary flex items-center space-x-2
                  ${pathname === item.href ? 'text-black dark:text-white' : 'text-muted-foreground'}`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.title}</span>
              </Link>
            );
          })}
        </nav>

        {/* Middle section - Page name */}
        <div className="font-semibold ml-auto">
          {getPageName(pathname)}
        </div>

        {/* Right section - User info and Logout */}
        <div className="ml-auto flex items-center space-x-4">
          <span className="text-sm text-muted-foreground">
            {session?.user?.name}
          </span>
          <Button
            variant="ghost"
            onClick={() => signOut()}
            className="text-sm"
          >
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
} 