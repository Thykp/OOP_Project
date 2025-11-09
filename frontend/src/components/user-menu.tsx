import { useNavigate, Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/context/auth-context"

function getInitials(nameOrEmail?: string | null) {
  if (!nameOrEmail) return "U"
  const raw = nameOrEmail.trim()
  if (raw.includes(" ")) {
    return raw
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join("")
  }
  // email
  return raw[0]?.toUpperCase() ?? "U"
}

export function UserMenu() {
  const { user, signOut } = useAuth()
  const nav = useNavigate()

  const fullName =
    (user?.user_metadata?.fullName as string | undefined) ||
    (user?.user_metadata?.firstName && user?.user_metadata?.lastName
      ? `${user.user_metadata.firstName} ${user.user_metadata.lastName}`
      : undefined)

  const display = fullName || user?.email || "User"
  const initials = getInitials(fullName || user?.email)

  const handleLogout = async () => {
    await signOut()
    nav("/signin", { replace: true })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-10 px-2">
          <div className="flex items-center gap-2">
            <Avatar>
              {/* If you store avatar URL in metadata, put it here */}
              <AvatarImage src={user?.user_metadata?.avatarUrl as string | undefined} alt={display} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <span className="hidden md:inline text-sm text-gray-700">{display}</span>
          </div>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate">Signed in as {user?.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {user?.user_metadata?.role === "ROLE_ADMIN" ? (
          <DropdownMenuItem asChild>
            <Link to="/admin/dashboard">Admin Dashboard</Link>
          </DropdownMenuItem>
        ) : user?.user_metadata?.role === "ROLE_STAFF" ? (
          <DropdownMenuItem asChild>
            <Link to="/viewappointment">View Appointments</Link>
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem asChild>
            <Link to="/dashboard">Dashboard</Link>
          </DropdownMenuItem>
        )}
        {/* Add these when you have pages: 
        <DropdownMenuItem asChild>
          <Link to="/profile">Profile</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/settings">Settings</Link>
        </DropdownMenuItem> 
        */}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="text-red-600">
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
