import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";

interface User {
  id: string;
  email: string;
  name: string;
  role?: string;
}

interface MenuItem {
  id: string;
  label: string;
  icon: string;
  href: string;
  children: MenuItem[];
  roles?: string[];
}

export function useCurrentUser() {
  const { data: session, status } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Handle loading state
    if (status === "loading") {
      setLoading(true);
      return;
    }

    // Handle authenticated state
    if (status === "authenticated" && session?.user) {
      setUser({
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role,
      });
      setLoading(false);
    }
    // Handle unauthenticated state
    else if (status === "unauthenticated") {
      setUser(null);
      setLoading(false);
    }
  }, [session, status]);

  return { user, loading };
}

// Role-based menu filtering
export function filterMenuByRole(
  menuItems: MenuItem[],
  userRole: string
): MenuItem[] {
  if (!userRole) return [];

  // Recursive function to filter menu items based on roles
  const filterItems = (items: MenuItem[]): MenuItem[] => {
    return items
      .filter(item => {
        // If item has no roles specified, it's accessible to everyone
        if (!item.roles || item.roles.length === 0) return true;

        // Check if user's role is in the item's allowed roles
        const isRoleAllowed = item.roles.includes(userRole);

        // If item has children, recursively filter children
        if (item.children && item.children.length > 0) {
          const filteredChildren = filterItems(item.children);

          // If item itself is not allowed but has accessible children, include it
          if (filteredChildren.length > 0) {
            return true;
          }
        }

        return isRoleAllowed;
      })
      .map(item => {
        // If the item has children, recursively filter them
        if (item.children && item.children.length > 0) {
          return {
            ...item,
            children: filterItems(item.children),
          };
        }
        return item;
      });
  };

  return filterItems(menuItems);
}
