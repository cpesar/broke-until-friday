import { NavLink, Outlet } from "react-router";
import { LayoutDashboard, ArrowLeftRight, PiggyBank, CreditCard, LogOut } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { authClient } from "@/lib/auth-client";
import { APP_NAME } from "@budget-app/shared";

const NAV_LINKS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { to: "/budgets", label: "Budgets", icon: PiggyBank },
  { to: "/credit", label: "Credit", icon: CreditCard },
];

function initials(name: string | undefined) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function AppLayout() {
  const { data: session } = authClient.useSession();

  return (
    <div className="flex min-h-svh">
      <aside className="flex h-svh w-60 flex-col border-r bg-sidebar text-sidebar-foreground">
        <div className="flex items-center gap-2 px-5 py-5">
          <img src="/favicon.svg" alt="" className="size-6" />
          <span className="font-heading font-semibold">{APP_NAME}</span>
        </div>
        <nav className="flex flex-col gap-1 px-3">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                }`
              }
            >
              <link.icon className="size-4" />
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto flex items-center gap-2.5 border-t px-4 py-4">
          <Avatar size="sm">
            <AvatarFallback>{initials(session?.user.name)}</AvatarFallback>
          </Avatar>
          <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
            {session?.user.email}
          </span>
          <button
            type="button"
            aria-label="Sign out"
            className="text-muted-foreground transition-colors hover:text-foreground"
            onClick={async () => {
              await authClient.signOut();
              window.location.href = "/";
            }}
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
