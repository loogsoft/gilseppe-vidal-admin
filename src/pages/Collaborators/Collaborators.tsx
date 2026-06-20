import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import axios from "axios";
import {
  AlertTriangle,
  BadgeCheck,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  Mail,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  UserRound,
  UsersRound,
} from "lucide-react";
import { toast } from "react-toastify";
import { useAuth } from "../../contexts/useAuth";
import { UserTypeEnum } from "../../dtos/enums/user-type.enum";
import {
  UserService,
  type UserProfileResponse,
} from "../../service/User.service";
import styles from "./Collaborators.module.css";

type RoleFilter = "ALL" | UserTypeEnum;

type CollaboratorForm = {
  name: string;
  email: string;
  password: string;
  userType: UserTypeEnum | "";
};

const INITIAL_FORM: CollaboratorForm = {
  name: "",
  email: "",
  password: "",
  userType: "",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ITEMS_PER_PAGE = 6;

function getInitials(name?: string): string {
  return (name || "Usuário")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatMemberDate(date?: Date): string {
  if (!date) return "Data não informada";

  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return "Data não informada";

  return parsedDate.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getRoleLabel(role: UserTypeEnum): string {
  return role === UserTypeEnum.ADMIN ? "Administrador" : "Vendedor";
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError<{ message?: string | string[] }>(error)) {
    return fallback;
  }

  const responseMessage = error.response?.data?.message;
  if (Array.isArray(responseMessage)) return responseMessage.join(" ");

  return responseMessage || fallback;
}

export function Collaborators() {
  const { user } = useAuth();
  const [companyId, setCompanyId] = useState(user?.companyId ?? "");
  const [users, setUsers] = useState<UserProfileResponse[]>([]);
  const [form, setForm] = useState<CollaboratorForm>(INITIAL_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [userToDelete, setUserToDelete] =
    useState<UserProfileResponse | null>(null);

  const loadCollaborators = useCallback(
    async (showLoading = true) => {
      if (!user?.id) return;

      try {
        if (showLoading) setLoadingUsers(true);
        setLoadError("");

        const resolvedCompanyId =
          user.companyId ||
          (await UserService.findOne(user.id)).companyId ||
          "";
        const allUsers = await UserService.findAll();
        const companyUsers = resolvedCompanyId
          ? allUsers.filter(
              (collaborator) => collaborator.companyId === resolvedCompanyId,
            )
          : allUsers;

        setCompanyId(resolvedCompanyId);
        setUsers(companyUsers);
      } catch (error: unknown) {
        setLoadError(
          getErrorMessage(
            error,
            "Não foi possível carregar os colaboradores desta empresa.",
          ),
        );
      } finally {
        if (showLoading) setLoadingUsers(false);
      }
    },
    [user?.companyId, user?.id],
  );

  useEffect(() => {
    void loadCollaborators();
  }, [loadCollaborators]);

  const emailIsValid = EMAIL_REGEX.test(form.email.trim());
  const passwordIsValid = form.password.length >= 8;
  const canCreate =
    form.name.trim().length >= 3 &&
    emailIsValid &&
    passwordIsValid &&
    form.userType !== "" &&
    Boolean(companyId) &&
    !creating;

  const adminCount = users.filter(
    (collaborator) => collaborator.userType === UserTypeEnum.ADMIN,
  ).length;
  const sellerCount = users.filter(
    (collaborator) => collaborator.userType === UserTypeEnum.SELLER,
  ).length;

  const filteredUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("pt-BR");

    return users.filter((collaborator) => {
      const matchesRole =
        roleFilter === "ALL" || collaborator.userType === roleFilter;
      const matchesSearch =
        !normalizedSearch ||
        collaborator.name
          ?.toLocaleLowerCase("pt-BR")
          .includes(normalizedSearch) ||
        collaborator.email
          ?.toLocaleLowerCase("pt-BR")
          .includes(normalizedSearch);

      return matchesRole && matchesSearch;
    });
  }, [roleFilter, search, users]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredUsers.length / ITEMS_PER_PAGE),
  );
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedUsers = filteredUsers.slice(
    (safeCurrentPage - 1) * ITEMS_PER_PAGE,
    safeCurrentPage * ITEMS_PER_PAGE,
  );

  const updateForm = <Key extends keyof CollaboratorForm>(
    key: Key,
    value: CollaboratorForm[Key],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleCreateUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canCreate || !companyId) return;

    try {
      setCreating(true);
      await UserService.create({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        userType: form.userType as UserTypeEnum,
        companyId,
      });
      await loadCollaborators(false);
      setForm(INITIAL_FORM);
      setShowPassword(false);
      setCurrentPage(1);
      toast.success("Colaborador criado com sucesso!", { autoClose: 2500 });
    } catch (error: unknown) {
      toast.error(
        getErrorMessage(error, "Não foi possível criar o colaborador."),
      );
    } finally {
      setCreating(false);
    }
  };

  const cannotDelete = (collaborator: UserProfileResponse) =>
    collaborator.id === user?.id ||
    (collaborator.userType === UserTypeEnum.ADMIN && adminCount <= 1);

  const getDeleteTitle = (collaborator: UserProfileResponse) => {
    if (collaborator.id === user?.id) {
      return "Você não pode remover seu próprio acesso.";
    }
    if (
      collaborator.userType === UserTypeEnum.ADMIN &&
      adminCount <= 1
    ) {
      return "A empresa precisa manter pelo menos um administrador.";
    }
    return `Remover ${collaborator.name || "colaborador"}`;
  };

  const handleDeleteUser = async () => {
    const target = userToDelete;
    if (!target || deletingId || cannotDelete(target)) return;

    try {
      setDeletingId(target.id);
      await UserService.remove(target.id);
      setUsers((current) =>
        current.filter((collaborator) => collaborator.id !== target.id),
      );
      setUserToDelete(null);
      toast.success("Colaborador removido com sucesso!", { autoClose: 2500 });
    } catch (error: unknown) {
      toast.error(
        getErrorMessage(error, "Não foi possível remover o colaborador."),
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.hero}>
          <div>
            <span className={styles.eyebrow}>Equipe e permissões</span>
            <h1 className={styles.title}>Gerenciamento de colaboradores</h1>
            <p className={styles.subtitle}>
              Cadastre pessoas, defina níveis de acesso e mantenha sua equipe
              organizada em um único lugar.
            </p>
          </div>
          <div className={styles.heroBadge}>
            <UsersRound size={18} />
            <span>{users.length} acessos ativos</span>
          </div>
        </header>

        <section className={styles.statsGrid} aria-label="Resumo da equipe">
          <article className={styles.statCard}>
            <span className={styles.statIcon}>
              <UsersRound size={19} />
            </span>
            <div>
              <strong>{users.length}</strong>
              <span>Total da equipe</span>
            </div>
          </article>
          <article className={styles.statCard}>
            <span className={`${styles.statIcon} ${styles.statIconAdmin}`}>
              <ShieldCheck size={19} />
            </span>
            <div>
              <strong>{adminCount}</strong>
              <span>Administradores</span>
            </div>
          </article>
          <article className={styles.statCard}>
            <span className={`${styles.statIcon} ${styles.statIconSeller}`}>
              <BadgeCheck size={19} />
            </span>
            <div>
              <strong>{sellerCount}</strong>
              <span>Vendedores</span>
            </div>
          </article>
        </section>

        <div className={styles.contentGrid}>
          <form className={styles.createCard} onSubmit={handleCreateUser}>
            <div className={styles.cardHeader}>
              <span className={styles.cardHeaderIcon}>
                <UserPlus size={20} />
              </span>
              <div>
                <h2>Novo colaborador</h2>
                <p>Crie um acesso seguro para um membro da equipe.</p>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="collaborator-name">Nome completo</label>
              <div className={styles.inputShell}>
                <UserRound size={17} />
                <input
                  id="collaborator-name"
                  value={form.name}
                  onChange={(event) => updateForm("name", event.target.value)}
                  placeholder="Ex.: Rodrigo Silva"
                  autoComplete="name"
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="collaborator-email">E-mail corporativo</label>
              <div className={styles.inputShell}>
                <Mail size={17} />
                <input
                  id="collaborator-email"
                  type="email"
                  value={form.email}
                  onChange={(event) => updateForm("email", event.target.value)}
                  placeholder="nome@empresa.com"
                  autoComplete="email"
                />
              </div>
              {form.email && !emailIsValid && (
                <span className={styles.fieldError}>
                  Informe um endereço de e-mail válido.
                </span>
              )}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="collaborator-password">Senha temporária</label>
              <div className={styles.inputShell}>
                <KeyRound size={17} />
                <input
                  id="collaborator-password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(event) =>
                    updateForm("password", event.target.value)
                  }
                  placeholder="Mínimo de 8 caracteres"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <span
                className={`${styles.passwordHint} ${
                  form.password && !passwordIsValid
                    ? styles.passwordHintError
                    : ""
                }`}
              >
                O colaborador poderá alterar essa senha depois.
              </span>
            </div>

            <fieldset className={styles.roleGroup}>
              <legend>Tipo de acesso</legend>
              <button
                type="button"
                className={`${styles.roleOption} ${
                  form.userType === UserTypeEnum.SELLER
                    ? styles.roleOptionActive
                    : ""
                }`}
                onClick={() =>
                  updateForm("userType", UserTypeEnum.SELLER)
                }
              >
                <BadgeCheck size={18} />
                <span>
                  <strong>Vendedor</strong>
                  <small>Operações e vendas</small>
                </span>
              </button>
              <button
                type="button"
                className={`${styles.roleOption} ${
                  form.userType === UserTypeEnum.ADMIN
                    ? styles.roleOptionActive
                    : ""
                }`}
                onClick={() => updateForm("userType", UserTypeEnum.ADMIN)}
              >
                <ShieldCheck size={18} />
                <span>
                  <strong>Administrador</strong>
                  <small>Acesso completo</small>
                </span>
              </button>
            </fieldset>

            <button
              type="submit"
              className={styles.createButton}
              disabled={!canCreate}
            >
              {creating ? (
                <>
                  <LoaderCircle className={styles.spinner} size={18} />
                  Criando acesso...
                </>
              ) : (
                <>
                  <UserPlus size={18} />
                  Cadastrar colaborador
                </>
              )}
            </button>
          </form>

          <section className={styles.listCard}>
            <div className={styles.listHeader}>
              <div>
                <h2>Colaboradores ativos</h2>
                <p>Gerencie os acessos vinculados a esta empresa.</p>
              </div>
              <span className={styles.resultCount}>
                {filteredUsers.length} resultado
                {filteredUsers.length === 1 ? "" : "s"}
              </span>
            </div>

            <div className={styles.toolbar}>
              <label className={styles.searchBox}>
                <Search size={17} />
                <input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Buscar por nome ou e-mail..."
                />
              </label>
              <select
                className={styles.roleFilter}
                value={roleFilter}
                onChange={(event) => {
                  setRoleFilter(event.target.value as RoleFilter);
                  setCurrentPage(1);
                }}
                aria-label="Filtrar por tipo de acesso"
              >
                <option value="ALL">Todos os acessos</option>
                <option value={UserTypeEnum.ADMIN}>Administradores</option>
                <option value={UserTypeEnum.SELLER}>Vendedores</option>
              </select>
            </div>

            {loadError && (
              <div className={styles.loadError} role="alert">
                <AlertTriangle size={19} />
                <span>{loadError}</span>
                <button type="button" onClick={() => void loadCollaborators()}>
                  Tentar novamente
                </button>
              </div>
            )}

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Colaborador</th>
                    <th>Acesso</th>
                    <th>Desde</th>
                    <th aria-label="Ações" />
                  </tr>
                </thead>
                <tbody>
                  {loadingUsers ? (
                    Array.from({ length: 4 }).map((_, index) => (
                      <tr key={`skeleton-${index}`} className={styles.skeletonRow}>
                        <td>
                          <span className={styles.skeletonLine} />
                        </td>
                        <td>
                          <span className={styles.skeletonLineSmall} />
                        </td>
                        <td>
                          <span className={styles.skeletonLineSmall} />
                        </td>
                        <td />
                      </tr>
                    ))
                  ) : paginatedUsers.length === 0 ? (
                    <tr>
                      <td colSpan={4}>
                        <div className={styles.emptyState}>
                          <span className={styles.emptyIcon}>
                            <UsersRound size={25} />
                          </span>
                          <strong>Nenhum colaborador encontrado</strong>
                          <p>
                            Ajuste os filtros ou cadastre um novo acesso para
                            sua equipe.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedUsers.map((collaborator) => {
                      const isCurrentUser = collaborator.id === user?.id;
                      const deleteDisabled = cannotDelete(collaborator);

                      return (
                        <tr key={collaborator.id}>
                          <td data-label="Colaborador">
                            <div className={styles.personCell}>
                              <span className={styles.avatar}>
                                {getInitials(collaborator.name)}
                              </span>
                              <div>
                                <div className={styles.personNameRow}>
                                  <strong>
                                    {collaborator.name || "Sem nome"}
                                  </strong>
                                  {isCurrentUser && (
                                    <span className={styles.youBadge}>Você</span>
                                  )}
                                </div>
                                <span className={styles.personEmail}>
                                  <Mail size={13} />
                                  {collaborator.email || "E-mail não informado"}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td data-label="Acesso">
                            <span
                              className={`${styles.roleBadge} ${
                                collaborator.userType === UserTypeEnum.ADMIN
                                  ? styles.roleBadgeAdmin
                                  : styles.roleBadgeSeller
                              }`}
                            >
                              {collaborator.userType === UserTypeEnum.ADMIN ? (
                                <ShieldCheck size={13} />
                              ) : (
                                <BadgeCheck size={13} />
                              )}
                              {getRoleLabel(collaborator.userType)}
                            </span>
                          </td>
                          <td data-label="Desde">
                            <span className={styles.dateCell}>
                              <CalendarDays size={14} />
                              {formatMemberDate(collaborator.dataCadastro)}
                            </span>
                          </td>
                          <td data-label="Ações" className={styles.actionsCell}>
                            <button
                              type="button"
                              className={styles.deleteButton}
                              onClick={() => setUserToDelete(collaborator)}
                              disabled={deleteDisabled || Boolean(deletingId)}
                              title={getDeleteTitle(collaborator)}
                              aria-label={getDeleteTitle(collaborator)}
                            >
                              {deletingId === collaborator.id ? (
                                <LoaderCircle
                                  className={styles.spinner}
                                  size={17}
                                />
                              ) : (
                                <Trash2 size={17} />
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <footer className={styles.listFooter}>
              <span>
                Exibindo {paginatedUsers.length} de {filteredUsers.length}
              </span>
              <div className={styles.pagination}>
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((page) => Math.max(1, page - 1))
                  }
                  disabled={safeCurrentPage === 1}
                  aria-label="Página anterior"
                >
                  <ChevronLeft size={17} />
                </button>
                <span>
                  {safeCurrentPage} de {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((page) => Math.min(totalPages, page + 1))
                  }
                  disabled={safeCurrentPage === totalPages}
                  aria-label="Próxima página"
                >
                  <ChevronRight size={17} />
                </button>
              </div>
            </footer>
          </section>
        </div>
      </div>

      {userToDelete && (
        <div
          className={styles.modalBackdrop}
          onClick={() => {
            if (!deletingId) setUserToDelete(null);
          }}
        >
          <div
            className={styles.deleteModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-collaborator-title"
            onClick={(event) => event.stopPropagation()}
          >
            <span className={styles.deleteModalIcon}>
              <AlertTriangle size={27} />
            </span>
            <span className={styles.deleteModalEyebrow}>Remover acesso</span>
            <h2 id="delete-collaborator-title">
              Excluir este colaborador?
            </h2>
            <p>
              O acesso de <strong>{userToDelete.name}</strong> será removido
              permanentemente e essa ação não poderá ser desfeita.
            </p>
            <div className={styles.deleteTarget}>
              <span className={styles.avatar}>
                {getInitials(userToDelete.name)}
              </span>
              <div>
                <strong>{userToDelete.name}</strong>
                <span>{userToDelete.email}</span>
              </div>
            </div>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={() => setUserToDelete(null)}
                disabled={Boolean(deletingId)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={styles.confirmDeleteButton}
                onClick={() => void handleDeleteUser()}
                disabled={Boolean(deletingId)}
              >
                {deletingId ? (
                  <>
                    <LoaderCircle className={styles.spinner} size={17} />
                    Removendo...
                  </>
                ) : (
                  <>
                    <Trash2 size={17} />
                    Remover acesso
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
