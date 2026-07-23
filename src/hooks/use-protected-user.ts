import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useCurrentUser } from "@/hooks/use-current-user";
import type { User } from "@/lib/account-types";
import { useAuth } from "@/store/auth";

type UseProtectedUserOptions = {
  role?: User["role"];
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

  const isPending = !auth.hydrated || auth.loading || userLoading;
  const isAuthorized = !isPending && Boolean(user) && (!role || user?.role === role);

  useEffect(() => {
    if (isPending) {
      return;
    }

    if (!user) {
      void navigate({ to: redirectTo });
      return;
    }

    if (role && user.role !== role) {
      void navigate({ to: unauthorizedRedirectTo });
    }
  }, [isPending, navigate, redirectTo, role, unauthorizedRedirectTo, user]);

  return {
    auth,
    user,
    isPending,
    isAuthorized,
  };
}
