import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styles from "./SupplierDetails.module.css";
import { SupplierService } from "../../service/Supplier.service";
import { Save } from "lucide-react";
import { ButtonBack } from "../../components/ButtonBack/ButtonBack";
import { ImageGallery } from "../../components/ImageGallery/ImageGallery";
// import type { SupplierStatus } from "../../dtos/request/supplier-request.dto";

export function SupplierDetails() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEdit = !!id;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [existingImageIds, setExistingImageIds] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const CATEGORY_OPTIONS = [
    "Camisa",
    "Camiseta",
    "Pólo",
    "Shorts",
    "Jaqueta",
    "Calça",
    "Vestido",
    "Suéter",
    "Moletom",
    "Cueca",
    "Calçado",
    "Cinto",
    "Carteira",
    "Óculos",
  ];
  const STATUS_OPTIONS = [
    { value: "active", label: "Ativo" },
    { value: "inactive", label: "Desativado" },
  ];
  const [category, setCategory] = useState(CATEGORY_OPTIONS[0]);
  const [status, setStatus] = useState(STATUS_OPTIONS[0].value);
  const [avatarColor, setAvatarColor] = useState("");
  const [saving, setSaving] = useState(false);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [imageNames, setImageNames] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const onPickImages = () => {
    fileInputRef.current?.click();
  };

  const onImagesSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;

    setImageFiles((prev) => [...prev, ...files]);
    setImageNames((prev) => [...prev, ...files.map((file) => file.name)]);

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreviews((prev) => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });

    event.target.value = "";
  };

  const onRemoveImage = (index: number) => {
    const existingCount = existingImageIds.length;
    if (index < existingCount) {
      setExistingImageIds((prev) => prev.filter((_, i) => i !== index));
    } else {
      // nada a fazer
    }
    setImageNames((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    if (selectedImageIndex >= imagePreviews.length - 1) {
      setSelectedImageIndex(Math.max(0, imagePreviews.length - 2));
    }
  };

  const onClearForm = () => {
    setName("");
    setCategory("");
    setEmail("");
    setLocation("");
    setStatus("active");
    setAvatarColor("");
    setImagePreviews([]);
    setExistingImageIds([]);
    setImageFiles([]);
    setSelectedImageIndex(0);
  };

  useEffect(() => {
    const loadSupplier = async () => {
      if (!isEdit || !id) {
        onClearForm();
        return;
      }
      const data = await SupplierService.findOne(id);
      setName(String(data?.name ?? ""));
      setCategory(String(data?.category ?? ""));
      setEmail(String(data?.email ?? ""));
      setPhone(String(data?.phone ?? ""));
      setLocation(String(data?.location ?? ""));
      setStatus(String(data?.status ?? "active"));
      setAvatarColor(String(data?.avatarColor ?? ""));
      setImageNames([]);
      setImageFiles([]);
      setExistingImageIds([]);
      setSelectedImageIndex(0);
      // Carregar previews das imagens existentes
      if (Array.isArray(data?.images) && data.images.length > 0) {
        setImagePreviews(data.images.map((img) => img.url));
        setImageNames(data.images.map((img) => img.url));
      } else {
        setImagePreviews([]);
        setImageNames([]);
      }
    };
    loadSupplier();
  }, [id, isEdit]);

  function onlyNumbers(value: string): string {
    return value.replace(/\D/g, "");
  }
  const onSave = async () => {
    if (saving) return;
    const formData = new FormData();
    const safeName = (name ?? "").toString().trim();
    formData.append("name", safeName);
    formData.append("category", String(category ?? ""));
    formData.append("email", String(email ?? ""));
    formData.append("phone", onlyNumbers(phone.trim() ?? ""));
    formData.append("location", String(location ?? ""));
    formData.append("status", String(status ?? ""));
    formData.append("avatarColor", String(avatarColor ?? ""));
    imageFiles.forEach((file) => {
      formData.append("image", file);
    });
    try {
      setSaving(true);
      if (isEdit && id) {
        await SupplierService.update(id, formData);
        navigate(-1);
        return;
      }
      await SupplierService.create(formData);
      navigate(-1);
    } finally {
      setSaving(false);
    }
  };

  const actionLabel = isEdit ? "Salvar alterações" : "Criar fornecedor";
  const loadingLabel = isEdit ? "Salvando..." : "Criando...";

  function phoneMask(value: string): string {
    if (!value) return "";

    // remove tudo que não for número
    value = value.replace(/\D/g, "");

    // limita a 11 dígitos
    value = value.slice(0, 11);

    if (value.length <= 10) {
      // telefone fixo: (99) 9999-9999
      return value
        .replace(/^(\d{2})(\d)/g, "($1) $2")
        .replace(/(\d{4})(\d)/, "$1-$2");
    } else {
      // celular: (99) 99999-9999
      return value
        .replace(/^(\d{2})(\d)/g, "($1) $2")
        .replace(/(\d{5})(\d)/, "$1-$2");
    }
  }
  return (
    <div className={styles.page}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: "none" }}
        onChange={onImagesSelected}
      />

      <div className={styles.top}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <ButtonBack />
          <div>
            <h1 className={styles.title}>
              {isEdit ? "Editar fornecedor" : "Cadastro de novo fornecedor"}
            </h1>
            <p className={styles.subtitle}>
              {isEdit
                ? "Atualize as informações principais do fornecedor."
                : "Preencha as informações principais do fornecedor."}
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
            type="button"
            onClick={onSave}
            disabled={saving}
          >
            <Save size={16} />
            {saving ? loadingLabel : actionLabel}
          </button>
        </div>
      </div>

      <div className={styles.content}>
        <aside className={styles.logoCard}>
          <div className={styles.logoTitle}>Logo do fornecedor</div>
          <ImageGallery
            previews={imagePreviews}
            selectedIndex={selectedImageIndex}
            imageNames={imageNames}
            onSelectImage={setSelectedImageIndex}
            onAddImages={onPickImages}
            onRemoveImage={onRemoveImage}
          />
          <p className={styles.logoTip}>
            Dica: use imagens com boa resolução para identificar a marca.
          </p>
        </aside>

        <div className={styles.formColumn}>
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelNumber}>1</span>
              <span className={styles.panelTitle}>Informações da empresa</span>
            </div>

            <div className={styles.form}>
              <label className={styles.field}>
                <span className={styles.label}>Nome</span>
                <input
                  className={styles.input}
                  placeholder="Ex: Pinha Distribuidora"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelNumber}>2</span>
              <span className={styles.panelTitle}>Contato e endereço</span>
            </div>

            <div className={styles.form}>
              <div className={styles.row2}>
                <label className={styles.field}>
                  <span className={styles.label}>E-mail</span>
                  <input
                    className={styles.input}
                    placeholder="contato@fornecedor.com.br"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>Telefone/WhatsApp</span>
                  <input
                    className={styles.input}
                    placeholder="(00) 00000-0000"
                    value={phoneMask(phone)}
                    onChange={(event) => setPhone(event.target.value)}
                  />
                </label>
              </div>
              <label className={styles.field}>
                <span className={styles.label}>Localização</span>
                <input
                  className={styles.input}
                  placeholder="Endereço completo"
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                />
              </label>
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelNumber}>3</span>
              <span className={styles.panelTitle}>Detalhes do fornecedor</span>
            </div>

            <div className={styles.form}>
              <div className={styles.row2}>
                <label className={styles.field}>
                  <span className={styles.label}>Categoria</span>
                  <select
                    className={styles.select}
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                  >
                    {CATEGORY_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>Status</span>
                  <select
                    className={styles.select}
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className={styles.row2}>
                <label className={styles.field}>
                  <span className={styles.label}>Cor do Avatar</span>
                  <input
                    className={styles.input}
                    placeholder="#000000"
                    value={avatarColor}
                    onChange={(event) => setAvatarColor(event.target.value)}
                  />
                </label>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
