import { useCallback, useEffect, useState } from "react";
import { UserService } from "../service/User.service";
import { AuthContext } from "./auth-context";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{
    id: string;
    name: string;
    email: string;
    companyId: string;
    userType: import("../dtos/enums/user-type.enum").UserTypeEnum;
  } | null>(null);

  const fetchUser = useCallback(async () => {
    const me = await UserService.getMe();
    let companyId: string | undefined = undefined;
    try {
      const verify = localStorage.getItem("companyId");
      if (verify) companyId = verify;
    } catch {
      // O armazenamento pode estar indisponível em ambientes restritos.
    }
    let profile: {
      id: string;
      name?: string;
      email?: string;
      companyId?: string;
      userType?: import("../dtos/enums/user-type.enum").UserTypeEnum;
    } = {
      id: me.id,
      email: me.email,
      companyId,
    };
    try {
      const full = await UserService.findOne(me.id);
      profile = {
        id: full.id ?? me.id,
        name: full.name,
        email: full.email ?? me.email,
        companyId: full.companyId || companyId,
        userType: full.userType,
      };
    } catch {
      // Mantém os dados básicos retornados por /me quando o perfil falhar.
    }
    if (!profile.companyId && companyId) {
      profile.companyId = companyId;
    }
    setUser({
      id: profile.id,
      name: profile.name ?? "",
      email: profile.email ?? "",
      companyId: profile.companyId ?? "",
      userType: profile.userType ?? ("ADMIN" as import("../dtos/enums/user-type.enum").UserTypeEnum),
    });
  }, []);

  useEffect(() => {
    async function validateToken() {
      const token = localStorage.getItem("token");

      if (!token) {
        setIsAuthenticated(false);
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        await fetchUser();
        setIsAuthenticated(true);
      } catch {
        localStorage.removeItem("token");
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    validateToken();
  }, [fetchUser]);

  function login(token: string) {
    localStorage.setItem("token", token);
    setIsAuthenticated(true);
    void fetchUser();
  }

  function logout() {
    localStorage.removeItem("token");
    setIsAuthenticated(false);
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, login, logout, loading, user }}
    >
      {children}
    </AuthContext.Provider>
  );
}
