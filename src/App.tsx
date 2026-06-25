import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { DashboardLayout } from "./components/layouts/DashboardLayout";
import { Dashboard } from "./pages/Dashboard/Dashboard";
import { DiscountStock } from "./pages/DiscountStock/DiscountStock";
import { Products } from "./pages/Product/Products";
import { ProductsDetails } from "./pages/Product/ProductsDetails";
import DiscountStockDetails from "./pages/DiscountStock/DiscountStockDetails";
import Login from "./pages/Login/Login";
import { useAuth } from "./contexts/useAuth";
import { Supplier } from "./pages/Supplier/Supplier";
import { SupplierDetails } from "./pages/Supplier/SupplierDetails";
import { Profille } from "./pages/Profille/Profille";
import { OutOfStock } from "./pages/OutOfStock/OutOfStock";
import { useMessageContext } from "./contexts/useMessageContext";
import Roleta from "./pages/Roulette/Roulette";
import { Credit } from "./pages/Credit/Credit";
import { CreditDetails } from "./pages/Credit/CreditDetails";
import { CreditSaleDetails } from "./pages/Credit/CreditSaleDetails";
import RegisterCompany from "./pages/registerCompany/RegisterCompany";
import { Collaborators } from "./pages/Collaborators/Collaborators";
import { MovementDetails } from "./pages/Movements/MovementDetails";
import { UserTypeEnum } from "./dtos/enums/user-type.enum";

export default function App() {
  const { isAuthenticated, loading, user } = useAuth();
  const { checkStockAndNotify } = useMessageContext();

  const canAccessApp = isAuthenticated && !!user;

  useEffect(() => {
    if (!canAccessApp) return;

    checkStockAndNotify();
  }, [checkStockAndNotify, canAccessApp]);

  useEffect(() => {
    const companyData = localStorage.getItem("company");

    if (companyData) {
      const company = JSON.parse(companyData);

      if (company.color) {
        document.documentElement.style.setProperty(
          "--highlight-primary",
          company.color,
        );

        function hexToRgba(hex: string, alpha: number) {
          let c = hex.replace("#", "");

          if (c.length === 3) {
            c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
          }

          const num = parseInt(c, 16);
          const r = (num >> 16) & 255;
          const g = (num >> 8) & 255;
          const b = num & 255;

          return `rgba(${r},${g},${b},${alpha})`;
        }

        document.documentElement.style.setProperty(
          "--highlight-secondary",
          hexToRgba(company.color, 0.15),
        );
      }
    }
  }, []);

  if (loading) {
    return null;
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={canAccessApp ? <Navigate to="/dashboard" replace /> : <Login />}
      />

      <Route
        path="/register-company"
        element={
          canAccessApp ? (
            <RegisterCompany />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route
        element={
          canAccessApp ? (
            <DashboardLayout />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/discount-stock" element={<DiscountStock />} />
        <Route path="/produtos" element={<Products />} />
        <Route path="/product-details/:id?" element={<ProductsDetails />} />
        <Route
          path="/discount-stock-details"
          element={<DiscountStockDetails />}
        />
        <Route path="/out-of-stock" element={<OutOfStock />} />
        <Route path="/suppliers" element={<Supplier />} />
        <Route path="/supplier-details/:id?" element={<SupplierDetails />} />
        <Route path="/config/:id?" element={<Profille />} />

        {user?.userType === UserTypeEnum.ADMIN && (
          <Route path="/collaborators" element={<Collaborators />} />
        )}

        <Route path="/roulette" element={<Roleta />} />
        <Route path="/credit" element={<Credit />} />
        <Route path="/credit-details/:id?" element={<CreditDetails />} />
        <Route
          path="/credit-sale-details/:id?"
          element={<CreditSaleDetails />}
        />
        <Route path="/movement-details/:id" element={<MovementDetails />} />
      </Route>

      <Route
        path="*"
        element={
          <Navigate to={canAccessApp ? "/dashboard" : "/login"} replace />
        }
      />
    </Routes>
  );
}