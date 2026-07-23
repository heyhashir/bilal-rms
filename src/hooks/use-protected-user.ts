import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useCurrentUser } from "@/hooks/use-current-user";
import type { User } from "@/lib/account-types";
import { useAuth } from "@/store/auth";

type UseProtectedUserOptions = {
  role?: User["role"] | User["role"][];
  redirectTo?: string;
  unauthorizedRedirectTo?: string;
};

export function useProtectedUser({
  role,
  redirectTo = "/login",
  unauthorizedRedirectTo = "/",
}: UseProtectedUserOptions = {}) {
  const auth = useAuth();
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const navigate = useNavigate();
  const allowedRoles = Array.isArray(role) ? role : role ? [role] : [];

  const isPending = !auth.hydrated || auth.loading || userLoading;
  const isAuthorized = !isPending && Boolean(user) && (allowedRoles.length === 0 || allowedRoles.includes(user!.role));

  useEffect(() => {
    if (isPending) {
      return;
    }

    if (!user) {
      void navigate({ to: redirectTo });
      return;
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      void navigate({ to: unauthorizedRedirectTo });
    }
  }, [allowedRoles, isPending, navigate, redirectTo, unauthorizedRedirectTo, user]);

  return {
    auth,
    user,
    isPending,
    isAuthorized,
  };
}
