import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import axios from "axios";
import {
  AlertCircle,
  BadgeCheck,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  Crown,
  Eye,
  EyeOff,
  Fingerprint,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  Mail,
  ImagePlus,
  Palette,
  Phone,
  Save,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "react-toastify";
import { useAuth } from "../../contexts/useAuth";
import { UserTypeEnum } from "../../dtos/enums/user-type.enum";
import { CompanyService } from "../../service/Company.service";
import { UserService } from "../../service/User.service";
import styles from "./Profille.module.css";
import { InscriptionTypeStatusEnum } from "../../dtos/enums/inscription-type-status.enum";
import {
  PlanStatusBubble,
  type PlanStatusType,
} from "../../components/PlanStatusBubble/PlanStatusBubble";

type PasswordFeedback = {
  type: "success" | "error";
  message: string;
};

type CompanySettings = {
  name: string;
  email: string;
  phone: string;
  document: string;
  color: string;
  imageUrl: string;
};

const EMPTY_COMPANY: CompanySettings = {
  name: "",
  email: "",
  phone: "",
  document: "",
  color: "#007BFF",
  imageUrl: "",
};

const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

function phoneMask(value: string): string {
  const normalized = value.replace(/\D/g, "").slice(0, 11);
  if (normalized.length <= 10) {
    return normalized
      .replace(/^(\d{2})(\d)/g, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }

  return normalized
    .replace(/^(\d{2})(\d)/g, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

function cpfCnpjMask(value: string): string {
  const normalized = value.replace(/\D/g, "").slice(0, 14);
  if (normalized.length <= 11) {
    return normalized
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1-$2");
  }

  return normalized
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function normalizeCompany(data: {
  companyName?: string;
  companyEmail?: string;
  companyPhone?: number | string;
  companyCpfCnpj?: number | string;
  color?: string;
  imageUrl?: string | null;
}): CompanySettings {
  return {
    name: data.companyName ?? "",
    email: data.companyEmail ?? "",
    phone: data.companyPhone ? String(data.companyPhone) : "",
    document: data.companyCpfCnpj ? String(data.companyCpfCnpj) : "",
    color: HEX_COLOR_REGEX.test(data.color ?? "")
      ? String(data.color)
      : "#007BFF",
    imageUrl: data.imageUrl ?? "",
  };
}

function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(normalized, 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError<{ message?: string | string[] }>(error)) {
    return fallback;
  }

  const responseMessage = error.response?.data?.message;
  if (Array.isArray(responseMessage)) return responseMessage.join(" ");

  return responseMessage || fallback;
}

export function Profille() {
  const { user } = useAuth();
  const authenticatedUserId = user?.id ?? "";
  const [companyId, setCompanyId] = useState("");
  const [company, setCompany] = useState<CompanySettings>(EMPTY_COMPANY);
  const [typeInscription, setTypeInscription] =
    useState<InscriptionTypeStatusEnum>(InscriptionTypeStatusEnum.CUSTOMER);
  const [savedCompany, setSavedCompany] =
    useState<CompanySettings>(EMPTY_COMPANY);
  const [memberDate, setMemberDate] = useState("");
  const [trialStartDate, setTrialStartDate] = useState<Date | string | null>(
    null,
  );
  const [userStatus, setUserStatus] = useState<UserTypeEnum | null>(
    user?.userType ?? null,
  );
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [companySaving, setCompanySaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordFeedback, setPasswordFeedback] =
    useState<PasswordFeedback | null>(null);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (!authenticatedUserId) return;

    const loadSettings = async () => {
      try {
        setLoadingProfile(true);
        const profile = await UserService.findOne(authenticatedUserId);
        const resolvedCompanyId = profile.companyId || user?.companyId || "";

        setCompanyId(resolvedCompanyId);
        setUserStatus(profile.userType);
        setTrialStartDate(profile.dataCadastro ?? null);
        setMemberDate(
          profile.dataCadastro
            ? new Date(profile.dataCadastro).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })
            : "",
        );

        if (resolvedCompanyId) {
          const companyData = await CompanyService.findOne(resolvedCompanyId);
          const normalizedCompany = normalizeCompany(companyData);
          setCompany(normalizedCompany);
          setSavedCompany(normalizedCompany);
          setTypeInscription(companyData.inscriptionType);
          setTrialStartDate((current) => current ?? companyData.date ?? null);
        }
      } catch (error: unknown) {
        toast.error(
          getErrorMessage(
            error,
            "Não foi possível carregar as configurações da conta.",
          ),
        );
      } finally {
        setLoadingProfile(false);
      }
    };

    void loadSettings();
  }, [authenticatedUserId, user?.companyId]);

  const status =
    userStatus === UserTypeEnum.ADMIN ? "Administrador" : "Vendedor";

  const isTesterPlan = typeInscription === InscriptionTypeStatusEnum.TESTER;
  const isCustomerPlan =
    typeInscription === InscriptionTypeStatusEnum.CUSTOMER;
  const planType: PlanStatusType | null = isCustomerPlan
    ? "customer"
    : isTesterPlan
      ? "tester"
      : null;
  const inscriptionStatus =
    typeInscription === InscriptionTypeStatusEnum.CUSTOMER
      ? "Cliente"
      : "Testando";
  const inscriptionStatusClass =
    isTesterPlan
      ? styles.roleBadgeInscriptionTester
      : styles.roleBadgeInscriptionCustomer;
  const InscriptionIcon = isCustomerPlan ? Crown : BadgeCheck;

  const companyColorIsValid = HEX_COLOR_REGEX.test(company.color);
  const companyChanged = useMemo(
    () =>
      company.name !== savedCompany.name ||
      company.email !== savedCompany.email ||
      company.phone !== savedCompany.phone ||
      company.document !== savedCompany.document ||
      company.color !== savedCompany.color ||
      logoFile !== null,
    [company, savedCompany, logoFile],
  );
  const canSaveCompany =
    companyChanged &&
    company.name.trim().length >= 2 &&
    companyColorIsValid &&
    !companySaving &&
    !loadingProfile;

  const updateCompany = <Key extends keyof CompanySettings>(
    key: Key,
    value: CompanySettings[Key],
  ) => {
    setCompany((current) => ({ ...current, [key]: value }));
  };

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const supportedTypes = ["image/png", "image/jpeg", "image/svg+xml"];
    if (!supportedTypes.includes(file.type) || file.size > 2 * 1024 * 1024) {
      toast.error("Selecione uma imagem PNG, JPG ou SVG de até 2MB.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setLogoPreview(String(reader.result ?? ""));
    reader.readAsDataURL(file);
    setLogoFile(file);
  };

  const handleCompanySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!companyId || !canSaveCompany) return;

    try {
      setCompanySaving(true);
      const imageUrl = logoFile
        ? await CompanyService.uploadLogo(logoFile)
        : company.imageUrl || undefined;
      const updatedCompany = await CompanyService.update(companyId, {
        companyName: company.name.trim(),
        companyEmail: company.email.trim(),
        companyPhone: Number(company.phone.replace(/\D/g, "")) || 0,
        companyCpfCnpj: Number(company.document.replace(/\D/g, "")) || 0,
        color: company.color,
        imageUrl,
      });

      if (authenticatedUserId) {
        await UserService.update(authenticatedUserId, {
          name: company.name.trim(),
        });
      }

      const normalizedCompany = normalizeCompany(updatedCompany);
      setCompany(normalizedCompany);
      setSavedCompany(normalizedCompany);
      setLogoFile(null);
      setLogoPreview("");
      if (logoInputRef.current) logoInputRef.current.value = "";
      localStorage.setItem("company", JSON.stringify(updatedCompany));
      window.dispatchEvent(new Event("company-updated"));
      document.documentElement.style.setProperty(
        "--highlight-primary",
        normalizedCompany.color,
      );
      document.documentElement.style.setProperty(
        "--highlight-secondary",
        hexToRgba(normalizedCompany.color, 0.12),
      );
      toast.success("Configurações da empresa atualizadas com sucesso!", {
        autoClose: 2500,
      });
    } catch (error: unknown) {
      toast.error(
        getErrorMessage(
          error,
          "Não foi possível salvar as configurações da empresa.",
        ),
      );
    } finally {
      setCompanySaving(false);
    }
  };

  const handlePasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setPasswordForm((current) => ({ ...current, [name]: value }));
    setPasswordFeedback(null);
  };

  const passwordHasMinimumLength = passwordForm.newPassword.length >= 8;
  const passwordHasNumber = /\d/.test(passwordForm.newPassword);
  const passwordHasSymbol = /[^A-Za-z0-9\s]/.test(passwordForm.newPassword);
  const passwordIsStrong =
    passwordHasMinimumLength && passwordHasNumber && passwordHasSymbol;
  const passwordsMatch =
    passwordForm.newPassword === passwordForm.confirmPassword;
  const passwordIsDifferent =
    passwordForm.newPassword !== passwordForm.currentPassword;
  const passwordFieldsFilled =
    passwordForm.currentPassword.length > 0 &&
    passwordForm.newPassword.length > 0 &&
    passwordForm.confirmPassword.length > 0;
  const canUpdatePassword =
    passwordFieldsFilled &&
    passwordIsStrong &&
    passwordsMatch &&
    passwordIsDifferent &&
    !passwordLoading;

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!authenticatedUserId || !canUpdatePassword) return;

    try {
      setPasswordLoading(true);
      setPasswordFeedback(null);
      await UserService.updatePassword(authenticatedUserId, {
        defaultPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      const successMessage = "Senha alterada com sucesso.";
      setPasswordFeedback({ type: "success", message: successMessage });
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      toast.success(successMessage, { autoClose: 2500 });
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(
        error,
        "Não foi possível alterar a senha. Tente novamente.",
      );
      setPasswordFeedback({ type: "error", message: errorMessage });
      toast.error(errorMessage, { autoClose: 3500 });
    } finally {
      setPasswordLoading(false);
    }
  };

  const displayName =
    company.name || user?.name || user?.email?.split("@")[0] || "Usuário";
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const profileEmail = company.email || user?.email || "E-mail não informado";
  const displayedLogo = logoPreview || company.imageUrl;

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.hero}>
          <div>
            <span className={styles.eyebrow}>Preferências da conta</span>
            <h1 className={styles.title}>Configurações</h1>
            <p className={styles.subtitle}>
              Gerencie a identidade da empresa e mantenha suas credenciais de
              acesso protegidas.
            </p>
          </div>
          <span className={styles.accountStatus}>
            <ShieldCheck size={16} />
            Conta protegida
          </span>
        </header>

        {loadingProfile && (
          <div className={styles.loadingBanner}>
            <LoaderCircle className={styles.spinner} size={18} />
            Carregando configurações...
          </div>
        )}

        <section className={styles.profileCard}>
          <div className={styles.profileAvatar}>
            {displayedLogo ? (
              <img src={displayedLogo} alt={`Logo ${displayName}`} />
            ) : (
              initials
            )}
          </div>
          <div className={styles.profileMain}>
            <div className={styles.profileHeading}>
              <h2>{displayName}</h2>
              <span className={styles.roleBadge}>
                <BadgeCheck size={13} />
                {status}
              </span>
              <span
                className={`${styles.roleBadgeInscription} ${inscriptionStatusClass}`}
              >
                <InscriptionIcon size={13} />
                {inscriptionStatus}
              </span>
            </div>
            <div className={styles.profileMeta}>
              <span>
                <Mail size={14} />
                {profileEmail}
              </span>
              <span>
                <CalendarDays size={14} />
                Membro desde {memberDate || "data não informada"}
              </span>
              <span>
                <Fingerprint size={14} />
                ID {companyId ? companyId.slice(0, 8).toUpperCase() : "—"}
              </span>
            </div>
          </div>
          {planType && (
            <PlanStatusBubble
              companyName={displayName}
              planType={planType}
              trialStartDate={trialStartDate}
            />
          )}
          <div className={styles.brandPreview}>
            <span
              className={styles.brandColor}
              style={{
                background: companyColorIsValid
                  ? company.color
                  : "var(--highlight-primary)",
              }}
            />
            <div>
              <strong>Cor da marca</strong>
              <span>{company.color}</span>
            </div>
          </div>
        </section>

        <div className={styles.settingsGrid}>
          <form className={styles.settingsCard} onSubmit={handleCompanySubmit}>
            <div className={styles.cardHeader}>
              <span className={styles.cardIcon}>
                <Building2 size={20} />
              </span>
              <div>
                <h2>Identidade da empresa</h2>
                <p>Informações exibidas em toda a plataforma.</p>
              </div>
              {companyChanged && (
                <span className={styles.unsavedBadge}>Não salvo</span>
              )}
            </div>

            <div className={styles.fieldsGrid}>
              <label className={styles.field}>
                <span>Nome da empresa</span>
                <div className={styles.inputShell}>
                  <Building2 size={17} />
                  <input
                    value={company.name}
                    onChange={(event) =>
                      updateCompany("name", event.target.value)
                    }
                    placeholder="Nome da empresa"
                  />
                </div>
              </label>

              <label className={styles.field}>
                <span>E-mail corporativo</span>
                <div
                  className={`${styles.inputShell} ${styles.inputShellDisabled}`}
                >
                  <Mail size={17} />
                  <input
                    type="email"
                    value={company.email}
                    placeholder="empresa@email.com"
                    disabled
                  />
                  <LockKeyhole size={14} />
                </div>
                <small>O e-mail principal não pode ser alterado aqui.</small>
              </label>

              <label className={styles.field}>
                <span>CPF ou CNPJ</span>
                <div className={styles.inputShell}>
                  <Fingerprint size={17} />
                  <input
                    value={cpfCnpjMask(company.document)}
                    onChange={(event) =>
                      updateCompany(
                        "document",
                        event.target.value.replace(/\D/g, "").slice(0, 14),
                      )
                    }
                    placeholder="00.000.000/0000-00"
                    inputMode="numeric"
                  />
                </div>
              </label>

              <label className={styles.field}>
                <span>Telefone</span>
                <div className={styles.inputShell}>
                  <Phone size={17} />
                  <input
                    value={phoneMask(company.phone)}
                    onChange={(event) =>
                      updateCompany(
                        "phone",
                        event.target.value.replace(/\D/g, "").slice(0, 11),
                      )
                    }
                    placeholder="(00) 00000-0000"
                    inputMode="tel"
                  />
                </div>
              </label>
            </div>

            <div className={styles.logoField}>
              <div className={styles.logoFieldPreview}>
                {displayedLogo ? (
                  <img src={displayedLogo} alt={`Logo ${displayName}`} />
                ) : (
                  <Building2 size={28} />
                )}
              </div>
              <div className={styles.logoFieldContent}>
                <strong>Logo da empresa</strong>
                <p>
                  {company.imageUrl
                    ? "Substitua a imagem exibida no menu e na identidade da empresa."
                    : "Adicione a imagem que será exibida no menu e na identidade da empresa."}
                </p>
                <input
                  ref={logoInputRef}
                  className={styles.logoInput}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml"
                  onChange={handleLogoChange}
                />
                <button
                  type="button"
                  className={styles.logoButton}
                  onClick={() => logoInputRef.current?.click()}
                >
                  <ImagePlus size={15} />
                  {displayedLogo ? "Trocar logo" : "Adicionar logo"}
                </button>
                <small>PNG, JPG ou SVG de até 2MB.</small>
              </div>
            </div>

            <div className={styles.brandField}>
              <div className={styles.brandFieldHeading}>
                <span className={styles.brandFieldIcon}>
                  <Palette size={18} />
                </span>
                <div>
                  <strong>Personalização da marca</strong>
                  <p>Essa cor é aplicada nos destaques e ações do sistema.</p>
                </div>
              </div>
              <div className={styles.colorControls}>
                <label className={styles.colorPicker}>
                  <input
                    type="color"
                    value={
                      companyColorIsValid ? company.color : savedCompany.color
                    }
                    onChange={(event) =>
                      updateCompany("color", event.target.value)
                    }
                    aria-label="Selecionar cor da empresa"
                  />
                  <span
                    style={{
                      background: companyColorIsValid
                        ? company.color
                        : "var(--highlight-primary)",
                    }}
                  />
                </label>
                <input
                  className={`${styles.colorTextInput} ${
                    company.color && !companyColorIsValid
                      ? styles.inputError
                      : ""
                  }`}
                  value={company.color}
                  onChange={(event) =>
                    updateCompany("color", event.target.value.slice(0, 7))
                  }
                  placeholder="#007BFF"
                  maxLength={7}
                />
                <div className={styles.colorSample}>
                  <Sparkles size={15} />
                  Prévia da identidade
                </div>
              </div>
              {company.color && !companyColorIsValid && (
                <span className={styles.fieldError}>
                  Informe uma cor hexadecimal válida, como #007BFF.
                </span>
              )}
            </div>

            <div className={styles.cardFooter}>
              <span>
                As alterações serão refletidas no menu, botões e destaques.
              </span>
              <button
                type="submit"
                className={styles.primaryButton}
                disabled={!canSaveCompany}
              >
                {companySaving ? (
                  <>
                    <LoaderCircle className={styles.spinner} size={17} />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save size={17} />
                    Salvar empresa
                  </>
                )}
              </button>
            </div>
          </form>

          <form
            className={`${styles.settingsCard} ${styles.securityCard}`}
            onSubmit={handlePasswordSubmit}
          >
            <div className={styles.cardHeader}>
              <span className={`${styles.cardIcon} ${styles.securityIcon}`}>
                <ShieldCheck size={20} />
              </span>
              <div>
                <h2>Segurança da conta</h2>
                <p>Atualize sua senha de acesso com segurança.</p>
              </div>
            </div>

            <label className={styles.field}>
              <span>Senha atual</span>
              <div className={styles.inputShell}>
                <KeyRound size={17} />
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  name="currentPassword"
                  value={passwordForm.currentPassword}
                  onChange={handlePasswordChange}
                  placeholder="Digite sua senha atual"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={() => setShowCurrentPassword((current) => !current)}
                  aria-label={
                    showCurrentPassword
                      ? "Ocultar senha atual"
                      : "Mostrar senha atual"
                  }
                >
                  {showCurrentPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </label>

            <label className={styles.field}>
              <span>Nova senha</span>
              <div
                className={`${styles.inputShell} ${
                  passwordForm.newPassword && !passwordIsStrong
                    ? styles.inputShellError
                    : ""
                }`}
              >
                <LockKeyhole size={17} />
                <input
                  type={showNewPassword ? "text" : "password"}
                  name="newPassword"
                  value={passwordForm.newPassword}
                  onChange={handlePasswordChange}
                  placeholder="Crie uma nova senha"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={() => setShowNewPassword((current) => !current)}
                  aria-label={
                    showNewPassword
                      ? "Ocultar nova senha"
                      : "Mostrar nova senha"
                  }
                >
                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>

            <label className={styles.field}>
              <span>Confirmar nova senha</span>
              <div
                className={`${styles.inputShell} ${
                  passwordForm.confirmPassword &&
                  (!passwordsMatch || !passwordIsDifferent)
                    ? styles.inputShellError
                    : ""
                }`}
              >
                <CheckCircle2 size={17} />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={passwordForm.confirmPassword}
                  onChange={handlePasswordChange}
                  placeholder="Repita a nova senha"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={() => setShowConfirmPassword((current) => !current)}
                  aria-label={
                    showConfirmPassword
                      ? "Ocultar confirmação"
                      : "Mostrar confirmação"
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
              {passwordForm.confirmPassword && !passwordsMatch && (
                <small className={styles.fieldError}>
                  As novas senhas não coincidem.
                </small>
              )}
              {passwordForm.confirmPassword &&
                passwordsMatch &&
                !passwordIsDifferent && (
                  <small className={styles.fieldError}>
                    A nova senha deve ser diferente da senha atual.
                  </small>
                )}
            </label>

            <div className={styles.requirements}>
              <strong>Sua nova senha precisa ter:</strong>
              <div className={styles.requirementsGrid}>
                <span
                  className={
                    passwordHasMinimumLength ? styles.requirementMet : ""
                  }
                >
                  <Check size={13} />8 caracteres
                </span>
                <span
                  className={passwordHasNumber ? styles.requirementMet : ""}
                >
                  <Check size={13} />
                  Um número
                </span>
                <span
                  className={passwordHasSymbol ? styles.requirementMet : ""}
                >
                  <Check size={13} />
                  Um símbolo
                </span>
              </div>
            </div>

            <button
              type="submit"
              className={styles.primaryButton}
              disabled={!canUpdatePassword}
              aria-busy={passwordLoading}
            >
              {passwordLoading ? (
                <>
                  <LoaderCircle className={styles.spinner} size={17} />
                  Alterando senha...
                </>
              ) : (
                <>
                  <LockKeyhole size={17} />
                  Alterar senha
                </>
              )}
            </button>

            {passwordFeedback && (
              <div
                className={`${styles.passwordFeedback} ${
                  passwordFeedback.type === "success"
                    ? styles.passwordFeedbackSuccess
                    : styles.passwordFeedbackError
                }`}
                role={passwordFeedback.type === "error" ? "alert" : "status"}
              >
                {passwordFeedback.type === "success" ? (
                  <CheckCircle2 size={18} />
                ) : (
                  <AlertCircle size={18} />
                )}
                <span>{passwordFeedback.message}</span>
              </div>
            )}
          </form>
        </div>
      </div>
    </main>
  );
}
