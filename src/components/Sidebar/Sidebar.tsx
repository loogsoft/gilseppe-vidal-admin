import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { FiSettings, FiUsers } from "react-icons/fi";
import styles from "./Sidebar.module.css";
import { IoExitOutline } from "react-icons/io5";
import { useAuth } from "../../contexts/useAuth";
import type { SvgIconComponent } from "@mui/icons-material";
import {
  Dashboard,
  Store,
  ShoppingCart,
  People,
  Notifications,
  CreditCardRounded,
  WorkspacePremium,
} from "@mui/icons-material";
import { UserTypeEnum } from "../../dtos/enums/user-type.enum";

type MenuItem = {
  type: "item";
  icon: SvgIconComponent;
  label: string;
  path: string;
  color: string;
};

const menu: MenuItem[] = [
  {
    type: "item",
    icon: Dashboard,
    label: "Dashboard",
    path: "/dashboard",
    color: "#6C63FF",
  },
  {
    type: "item",
    icon: Store,
    label: "Produtos",
    path: "/produtos",
    color: "#00B894",
  },
  {
    type: "item",
    icon: ShoppingCart,
    label: "Baixa de estoque",
    path: "/discount-stock",
    color: "#005ca2",
  },
  {
    type: "item",
    icon: Notifications,
    label: "Sem estoque",
    path: "/out-of-stock",
    color: "#E17055",
  },
  {
    type: "item",
    icon: People,
    label: "Fornecedores",
    path: "/suppliers",
    color: "#F0932B",
  },
  {
    type: "item",
    icon: CreditCardRounded,
    label: "Crediarios",
    path: "/credit",
    color: "#ffd900",
  },
  // {
  //   type: "group",
  //   icon: BarChart,
  //   label: "Estratégias",
  //   color: "#438fe1",
  //   key: "estrategias",
  //   children: [
  //     {
  //       type: "item",
  //       icon: Casino,
  //       label: "Roleta",
  //       path: "/roulette",
  //       color: "#6C63FF",
  //     },
  //   ],
  // },
];

function readCompanyBrand() {
  const companyData = localStorage.getItem("company");
  if (!companyData) return { name: "Loog System", imageUrl: undefined };
  try {
    const company = JSON.parse(companyData) as {
      companyName?: string;
      name?: string;
      imageUrl?: string | null;
    };
    return {
      name: company.companyName || company.name || "Loog System",
      imageUrl: company.imageUrl || undefined,
    };
  } catch {
    return { name: "Loog System", imageUrl: undefined };
  }
}

export function Sidebar() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [companyBrand, setCompanyBrand] = useState(readCompanyBrand);

  useEffect(() => {
    const updateBrand = () => setCompanyBrand(readCompanyBrand());
    window.addEventListener("company-updated", updateBrand);
    window.addEventListener("storage", updateBrand);
    return () => {
      window.removeEventListener("company-updated", updateBrand);
      window.removeEventListener("storage", updateBrand);
    };
  }, []);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const displayName = user?.name || user?.email?.split("@")[0] || "Usuário";
  const displayEmail = user?.email || "usuario@email.com";
  const initials = displayName
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);

  const renderItem = (item: MenuItem) => {
    return (
      <NavLink
        key={item.path}
        to={item.path}
        className={({ isActive: navActive }) =>
          navActive ? styles.active : styles.link
        }
        style={{ gap: 12 }}
      >
        <item.icon
          className={styles.icon}
          style={{ color: item.color }}
          fontSize="small"
        />
        <span>{item.label}</span>
      </NavLink>
    );
  };

  return (
    <aside className={styles.sidebar}>
      <div>
        <div className={styles.brand}>
          <div className={styles.brandLogo}>
            {companyBrand.imageUrl ? (
              <img
                src={companyBrand.imageUrl}
                alt={`Logo ${companyBrand.name}`}
                style={{ borderRadius: 100 }}
              />
            ) : (
              <WorkspacePremium
                style={{ fontSize: "30px", color: "var(--highlight-primary)" }}
              />
            )}
          </div>
          <div>
            <strong
              className={styles.brandTitle}
              style={{ fontSize: 18, letterSpacing: 2 }}
            >
              {companyBrand.name}
            </strong>
          </div>
        </div>
        <div className={styles.footerDivider} />

        <nav className={styles.menu}>{menu.map(renderItem)}</nav>
      </div>

      <div className={styles.footer}>
        <div className={styles.footerDivider} />
        <div>
          <div
            className={styles.userCard}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                navigate(`/config/${user?.id}`);
              }
            }}
          >
            <div className={styles.userAvatar}>{initials}</div>
            <div className={styles.userInfo}>
              <div className={styles.userName}>{displayName}</div>
              <div className={styles.userEmail}>{displayEmail}</div>
            </div>
          </div>

          {user?.userType === UserTypeEnum.ADMIN && (
            <div>
              <NavLink
                to={"/config"}
                className={({ isActive }) =>
                  isActive ? styles.active : styles.linkButton
                }
                style={{ gap: 12 }}
              >
                <FiSettings className={styles.icon} color="#636E72" size={20} />
                <span>Configurações</span>
              </NavLink>

              <NavLink
                to={"/collaborators"}
                className={({ isActive }) =>
                  isActive ? styles.active : styles.linkButton
                }
                style={{ gap: 12 }}
              >
                <FiUsers className={styles.icon} color="#636E72" size={20} />
                <span>Colaboradores</span>
              </NavLink>
            </div>
          )}
        </div>
        <NavLink
          onClick={() => handleLogout()}
          to={""}
          className={({ isActive }) =>
            isActive ? styles.buttonExit : styles.linkButton
          }
          style={{ gap: 12 }}
        >
          <IoExitOutline className={styles.icon} color="#D63031" size={20} />
          <span>Sair</span>
        </NavLink>
      </div>
    </aside>
  );
}
