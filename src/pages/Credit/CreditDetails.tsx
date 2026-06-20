import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styles from "./CreditDetails.module.css";
import {
  BadgeCheck,
  Mail,
  MapPin,
  Phone,
  Save,
  UserRound,
} from "lucide-react";
import { ButtonBack } from "../../components/ButtonBack/ButtonBack";
import { CreditCustomerService } from "../../service/Credit-customer.service";

function phoneMask(value: string): string {
  if (!value) return "";
  value = value.replace(/\D/g, "");
  value = value.slice(0, 11);
  if (value.length <= 10) {
    return value
      .replace(/^(\d{2})(\d)/g, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  } else {
    return value
      .replace(/^(\d{2})(\d)/g, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2");
  }
}

function cpfMask(value: string): string {
  if (!value) return "";

  value = value.replace(/\D/g, "").slice(0, 11);

  return value
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function cepMask(value: string): string {
  if (!value) return "";

  value = value.replace(/\D/g, "").slice(0, 8);

  return value.replace(/^(\d{5})(\d)/, "$1-$2");
}

export function CreditDetails() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEdit = !!id;
  const [saving, setSaving] = useState(false);
  const [loadingCustomer, setLoadingCustomer] = useState(isEdit);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [CPF, setCPF] = useState("");
  const [phone, setPhone] = useState("");
  const [road, setRoad] = useState("");
  const [number, setNumber] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");

  useEffect(() => {
    if (!id) return;

    const loadCustomer = async () => {
      try {
        setLoadingCustomer(true);
        const customer = await CreditCustomerService.findOne(id);
        setCustomerName(customer.customerName ?? "");
        setCustomerEmail(customer.customerEmail ?? "");
        setCPF(customer.CPF ?? "");
        setPhone(customer.phone ?? "");
        setRoad(customer.road ?? "");
        setNumber(customer.number ?? "");
        setNeighborhood(customer.neighborhood ?? "");
        setCity(customer.city ?? "");
        setState(customer.state ?? "");
        setZipCode(customer.zipCode ?? "");
      } catch (error) {
        console.error(error);
        alert("Não foi possível carregar os dados do cliente.");
        navigate(-1);
      } finally {
        setLoadingCustomer(false);
      }
    };

    void loadCustomer();
  }, [id, navigate]);

  const onSave = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (saving || loadingCustomer) return;
    if (!customerName.trim()) {
      alert("Nome do cliente é obrigatório");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!customerEmail.trim() || !emailRegex.test(customerEmail.trim())) {
      alert("Informe um e-mail válido");
      return;
    }
    const cpfNum = CPF.replace(/\D/g, "");
    if (!cpfNum || cpfNum.length !== 11) {
      alert("CPF deve conter 11 dígitos numéricos");
      return;
    }
    if (!phone.trim()) {
      alert("Telefone é obrigatório");
      return;
    }
    if (
      !road.trim() ||
      !number.trim() ||
      !neighborhood.trim() ||
      !city.trim() ||
      !state.trim() ||
      !zipCode.trim()
    ) {
      alert("Preencha todos os campos de endereço");
      return;
    }
    const payload = {
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim(),
      CPF: CPF.replace(/\D/g, ""),
      phone: phone.replace(/\D/g, ""),
      road: road.trim(),
      number: number.trim(),
      neighborhood: neighborhood.trim(),
      city: city.trim(),
      state: state.trim(),
      zipCode: zipCode.replace(/\D/g, ""),
    };
    try {
      setSaving(true);
      if (isEdit && id) {
        await CreditCustomerService.update(id, payload);
      } else {
        await CreditCustomerService.create(payload);
      }
      navigate(-1);
    } finally {
      setSaving(false);
    }
  };

  const actionLabel = isEdit ? "Salvar alterações" : "Cadastrar cliente";
  const loadingLabel = isEdit ? "Salvando..." : "Cadastrando...";
  const customerLabel = customerName.trim() || "Novo cliente";
  const customerInitials = customerLabel
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const customerLocation = [city.trim(), state.trim()]
    .filter(Boolean)
    .join(" • ");
  const customerAddress = [
    road.trim(),
    number.trim(),
    neighborhood.trim(),
    customerLocation,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.top}>
          <div className={styles.heroContent}>
            <ButtonBack />
            <div className={styles.heroText}>
              <span className={styles.eyebrow}>Crediários / Clientes</span>
              <h1 className={styles.title}>
                {isEdit ? "Editar cliente" : "Novo cliente"}
              </h1>
              <p className={styles.subtitle}>
                {isEdit
                  ? "Atualize as informações pessoais e o endereço cadastrado."
                  : "Cadastre os dados necessários para abrir um novo crediário."}
              </p>
            </div>
          </div>
          <div className={styles.topActions}>
            <button
              className={styles.discard}
              type="button"
              onClick={() => navigate(-1)}
            >
              Cancelar
            </button>
            <button
              className={styles.save}
              type="submit"
              form="credit-customer-form"
              disabled={saving || loadingCustomer}
            >
              {saving || loadingCustomer ? (
                <span className={styles.spinner} />
              ) : (
                <Save size={16} />
              )}
              {loadingCustomer
                ? "Carregando..."
                : saving
                  ? loadingLabel
                  : actionLabel}
            </button>
          </div>
        </header>

        <section className={styles.profileCard}>
          <div className={styles.avatar} aria-hidden="true">
            {customerInitials}
          </div>

          <div className={styles.profileMain}>
            <div className={styles.profileHeading}>
              <h2 className={styles.profileName}>{customerLabel}</h2>
              <span className={styles.statusBadge}>
                <BadgeCheck size={14} />
                {isEdit ? "Cliente cadastrado" : "Novo cadastro"}
              </span>
            </div>

            <div className={styles.profileMeta}>
              <span className={styles.metaItem}>
                <Mail size={15} />
                {customerEmail.trim() || "E-mail não informado"}
              </span>
              <span className={styles.metaItem}>
                <Phone size={15} />
                {phoneMask(phone) || "Telefone não informado"}
              </span>
              <span className={styles.metaItem}>
                <MapPin size={15} />
                {customerAddress || "Endereço não informado"}
              </span>
            </div>
          </div>
        </section>

        <form
          id="credit-customer-form"
          className={styles.formCard}
          onSubmit={onSave}
        >
          <section className={styles.formSection}>
            <div className={styles.sectionHeading}>
              <span className={styles.sectionIcon}>
                <UserRound size={18} />
              </span>
              <div>
                <h2 className={styles.sectionTitle}>Dados pessoais</h2>
                <p className={styles.sectionDescription}>
                  Informações usadas para identificar e contatar o cliente.
                </p>
              </div>
            </div>

            <div className={styles.personalGrid}>
              <label className={`${styles.field} ${styles.fieldWide}`}>
                <span className={styles.label}>Nome completo</span>
                <input
                  className={styles.input}
                  placeholder="Ex: Eduardo Silva"
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  autoComplete="name"
                  required
                />
              </label>
              <label className={`${styles.field} ${styles.fieldWide}`}>
                <span className={styles.label}>E-mail</span>
                <input
                  className={styles.input}
                  type="email"
                  placeholder="cliente@email.com"
                  value={customerEmail}
                  onChange={(event) => setCustomerEmail(event.target.value)}
                  autoComplete="email"
                  required
                />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>CPF</span>
                <input
                  className={styles.input}
                  placeholder="000.000.000-00"
                  value={cpfMask(CPF)}
                  onChange={(event) =>
                    setCPF(event.target.value.replace(/\D/g, "").slice(0, 11))
                  }
                  inputMode="numeric"
                  required
                />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Telefone</span>
                <input
                  className={styles.input}
                  type="tel"
                  placeholder="(00) 00000-0000"
                  value={phoneMask(phone)}
                  onChange={(event) =>
                    setPhone(
                      event.target.value.replace(/\D/g, "").slice(0, 11),
                    )
                  }
                  autoComplete="tel"
                  inputMode="tel"
                  required
                />
              </label>
            </div>
          </section>

          <div className={styles.sectionDivider} />

          <section className={styles.formSection}>
            <div className={styles.sectionHeading}>
              <span className={styles.sectionIcon}>
                <MapPin size={18} />
              </span>
              <div>
                <h2 className={styles.sectionTitle}>Endereço</h2>
                <p className={styles.sectionDescription}>
                  Localização principal vinculada ao cadastro.
                </p>
              </div>
            </div>

            <div className={styles.addressGrid}>
              <label className={`${styles.field} ${styles.roadField}`}>
                <span className={styles.label}>Rua</span>
                <input
                  className={styles.input}
                  placeholder="Nome da rua ou avenida"
                  value={road}
                  onChange={(event) => setRoad(event.target.value)}
                  autoComplete="street-address"
                  required
                />
              </label>
              <label className={`${styles.field} ${styles.numberField}`}>
                <span className={styles.label}>Número</span>
                <input
                  className={styles.input}
                  placeholder="Nº"
                  value={number}
                  onChange={(event) => setNumber(event.target.value)}
                  required
                />
              </label>
              <label className={`${styles.field} ${styles.neighborhoodField}`}>
                <span className={styles.label}>Bairro</span>
                <input
                  className={styles.input}
                  placeholder="Bairro"
                  value={neighborhood}
                  onChange={(event) => setNeighborhood(event.target.value)}
                  required
                />
              </label>
              <label className={`${styles.field} ${styles.cityField}`}>
                <span className={styles.label}>Cidade</span>
                <input
                  className={styles.input}
                  placeholder="Cidade"
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  autoComplete="address-level2"
                  required
                />
              </label>
              <label className={`${styles.field} ${styles.stateField}`}>
                <span className={styles.label}>Estado</span>
                <input
                  className={styles.input}
                  placeholder="UF"
                  value={state}
                  onChange={(event) =>
                    setState(event.target.value.toUpperCase().slice(0, 2))
                  }
                  autoComplete="address-level1"
                  maxLength={2}
                  required
                />
              </label>
              <label className={`${styles.field} ${styles.zipCodeField}`}>
                <span className={styles.label}>CEP</span>
                <input
                  className={styles.input}
                  placeholder="00000-000"
                  value={cepMask(zipCode)}
                  onChange={(event) =>
                    setZipCode(
                      event.target.value.replace(/\D/g, "").slice(0, 8),
                    )
                  }
                  autoComplete="postal-code"
                  inputMode="numeric"
                  required
                />
              </label>
            </div>
          </section>
        </form>
      </div>
    </div>
  );
}
