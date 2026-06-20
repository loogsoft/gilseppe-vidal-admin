import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styles from "./ProductDetails.module.css";
import { ProductCategoryEnum } from "../../dtos/enums/product-category.enum";
import { ProductStatusEnum } from "../../dtos/enums/product-status.enum";
import { ProductService } from "../../service/Product.service";
import type { ProductRequest } from "../../dtos/request/product-request.dto";
import type { ProductVariationRequestDto } from "../../dtos/request/product-variation-request.dto";
import type { ProductVariationResponseDto } from "../../dtos/response/product-variation-response.dto";
import { Save, Plus, Pencil, X } from "lucide-react";
import { ImageGallery } from "../../components/ImageGallery/ImageGallery";
import EntityCard from "../../components/EntityCard/EntityCard";
import { ButtonBack } from "../../components/ButtonBack/ButtonBack";
import { FiTrash2 } from "react-icons/fi";
import { toast } from "react-toastify";
import { SupplierService } from "../../service/Supplier.service";
import type { SupplierResponseDto } from "../../dtos/response/supplier-response.dto";

type Variation = ProductVariationRequestDto | ProductVariationResponseDto;

const PRODUCT_COLORS = [
  { label: "Preto", hex: "#1A1A1A" },
  { label: "Branco", hex: "#FFFFFF" },
  { label: "Cinza", hex: "#9E9E9E" },
  { label: "Azul", hex: "#1565C0" },
  { label: "Vermelho", hex: "#C62828" },
];

const ProductType = {
  UNIQUE: "UNIQUE",
  VARIATION: "VARIATION",
} as const;

export function ProductsDetails() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEdit = !!id;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const variationFileInputRef = useRef<HTMLInputElement | null>(null);
  const colorPickerRef = useRef<HTMLInputElement | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [editingColor, setEditingColor] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const [productType, setProductType] = useState<
    (typeof ProductType)[keyof typeof ProductType]
  >(ProductType.UNIQUE);
  const [category, setCategory] = useState<ProductCategoryEnum>(
    ProductCategoryEnum.SHIRT,
  );
  const [status, setStatus] = useState<ProductStatusEnum>(
    ProductStatusEnum.ACTIVED,
  );
  const [price, setPrice] = useState("");
  const [promoPrice, setPromoPrice] = useState("");
  const [color, setColor] = useState("");
  const [size, setSize] = useState("P");
  const [lowStock, setLowStock] = useState("5");
  const [activeLowStock, setActiveLowStock] = useState(true);
  const [stock, setStock] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [suppliers, setSuppliers] = useState<SupplierResponseDto[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);
  const [loadingProduct, setLoadingProduct] = useState(isEdit);
  const [imageNames, setImageNames] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  // Formata valor para 2 casas decimais (ex: 100 -> 100,00)
  const formatCurrency = (value: string) => {
    const num = value.replace(/[^0-9]/g, "");
    if (!num) return "";
    const intValue = parseInt(num, 10);
    return (intValue / 100).toFixed(2).replace(".", ",");
  };

  const handlePriceChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value.replace(/[^0-9]/g, "");
    if (!raw) {
      setPrice("");
      return;
    }
    setPrice(formatCurrency(raw));
  };

  const handlePromoPriceChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const raw = event.target.value.replace(/[^0-9]/g, "");
    setPromoPrice(raw ? formatCurrency(raw) : "");
  };

  const [existingImageIds, setExistingImageIds] = useState<string[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [variations, setVariations] = useState<Variation[]>([]);
  const [expandedVariationForm, setExpandedVariationForm] = useState(false);
  const [variationPrice, setVariationPrice] = useState("");
  const [variationStock, setVariationStock] = useState("");
  const [variationColor, setVariationColor] = useState("");
  const [showVariationColorPicker, setShowVariationColorPicker] =
    useState(false);
  const [variationSize, setVariationSize] = useState("");
  const [variationIsActive, setVariationIsActive] = useState(true);
  const [variationLowStockAlertEnabled, setVariationLowStockAlertEnabled] =
    useState(false);
  const [variationLowStock, setVariationLowStock] = useState("5");
  const [variationImageFiles, setVariationImageFiles] = useState<File[]>([]);
  const [variationImagePreviews, setVariationImagePreviews] = useState<
    string[]
  >([]);
  const [selectedVariationImageIndex, setSelectedVariationImageIndex] =
    useState(0);
  const [editingVariationIndex, setEditingVariationIndex] = useState<
    number | null
  >(null);
  const categoryOptions = useMemo(() => Object.values(ProductCategoryEnum), []);
  const statusOptions = useMemo(() => Object.values(ProductStatusEnum), []);

  const getStatusLabel = (status: ProductStatusEnum) => {
    switch (status) {
      case ProductStatusEnum.ACTIVED:
        return "Ativo";
      case ProductStatusEnum.DISABLED:
        return "Desativado";
      default:
        return status;
    }
  };

  useEffect(() => {
    const loadSuppliers = async () => {
      try {
        const response = await SupplierService.findAll();
        setSuppliers(Array.isArray(response) ? response : response.data ?? []);
      } catch {
        toast.error("Não foi possível carregar os fornecedores.");
      } finally {
        setLoadingSuppliers(false);
      }
    };

    void loadSuppliers();
  }, []);

  useEffect(() => {
    const loadProduct = async () => {
      if (!isEdit || !id) {
        return;
      }

      try {
        const data = await ProductService.findOne(id);
        setName(data.name ?? "");
        setDescription(data.description ?? "");
        setCategory(data.category ?? ProductCategoryEnum.SHIRT);
        setStatus(data.status ?? ProductStatusEnum.ACTIVED);
        setPrice(data.price ? String(data.price).replace(".", ",") : "");
        setPromoPrice(
          data.promoPrice ? String(data.promoPrice).replace(".", ",") : "",
        );
        setColor(data.color ?? "");
        setSize(data.size ?? "P");
        setLowStock(String(data.lowStock ?? ""));
        setActiveLowStock(!!data.activeLowStock);
        setStock(String(data.stock ?? ""));
        setSupplierId(data.supplier?.id ?? "");
        setImageNames((data.images || []).map((img) => img.fileName));
        setImageFiles([]);
        setImagePreviews((data.images || []).map((img) => img.url));
        setExistingImageIds((data.images || []).map((img) => img.id));
        setSelectedImageIndex(0);
        const hasVariations =
          (data.price as number | null) === null &&
          (data.stock ?? null) === null &&
          (data.variations || []).length > 0;
        setProductType(
          hasVariations ? ProductType.VARIATION : ProductType.UNIQUE,
        );
        const cleanLoadedVariations = (data.variations || []).map((v) => ({
          name: v.name ?? undefined,
          price: v.price === null ? undefined : Number(v.price),
          stock: Number(v.stock ?? 0),
          isActive: v.isActive ?? true,
          color: v.color ?? "",
          size: v.size ?? "",
          imageUrl: v.imageUrl ?? undefined,
          activeLowStock: v.activeLowStock ?? false,
          lowStock: v.lowStock ?? 0,
        })) as ProductVariationRequestDto[];
        setVariations(hasVariations ? cleanLoadedVariations : []);
      } catch {
        toast.error("Não foi possível carregar os dados do produto.");
      } finally {
        setLoadingProduct(false);
      }
    };

    void loadProduct();
  }, [id, isEdit]);

  const onPickImages = () => {
    fileInputRef.current?.click();
  };

  const onImagesSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;

    setImageNames((prev) => [...prev, ...files.map((file) => file.name)]);
    setImageFiles((prev) => [...prev, ...files]);

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
      const fileIndex = index - existingCount;
      setImageFiles((prev) => prev.filter((_, i) => i !== fileIndex));
    }

    setImageNames((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));

    if (selectedImageIndex >= imagePreviews.length - 1) {
      setSelectedImageIndex(Math.max(0, imagePreviews.length - 2));
    }
  };

  const onOpenVariationForm = () => {
    setVariationPrice("");
    setVariationStock("");
    setVariationColor("");
    setVariationSize("");
    setVariationIsActive(true);
    setVariationImageFiles([]);
    setVariationImagePreviews([]);
    setSelectedVariationImageIndex(0);
    setShowVariationColorPicker(false);
    setEditingVariationIndex(null);
    setVariationLowStockAlertEnabled(false);
    setVariationLowStock("5");
    setExpandedVariationForm(true);
  };

  const onCloseVariationForm = () => {
    setExpandedVariationForm(false);
    setVariationImageFiles([]);
    setVariationImagePreviews([]);
    setSelectedVariationImageIndex(0);
    setShowVariationColorPicker(false);
    setEditingVariationIndex(null);
  };

  const onProductTypeChange = (
    nextType: (typeof ProductType)[keyof typeof ProductType],
  ) => {
    if (nextType === productType) return;

    onCloseVariationForm();
    setProductType(nextType);
  };

  const onEditVariation = (index: number) => {
    const v = variations[index];
    setVariationColor(v.color || "");
    setVariationSize(v.size || "");
    setVariationPrice(v.price ? String(v.price).replace(".", ",") : "");
    setVariationStock(
      v.stock !== undefined && v.stock !== null ? String(v.stock) : "",
    );
    setVariationIsActive(v.isActive ?? true);
    setVariationLowStockAlertEnabled(Boolean(v.activeLowStock ?? v.lowStock));
    setVariationLowStock(
      v.lowStock !== undefined && v.lowStock !== null && v.lowStock > 0
        ? String(v.lowStock)
        : "5",
    );
    setVariationImageFiles([]);
    const previews = (v.images ?? []).map((image) =>
      image instanceof File ? URL.createObjectURL(image) : image.url,
    );
    setVariationImagePreviews(
      previews.length > 0 ? previews : v.imageUrl ? [v.imageUrl] : [],
    );
    setSelectedVariationImageIndex(0);
    setShowVariationColorPicker(false);
    setEditingVariationIndex(index);
    setExpandedVariationForm(true);
  };

  const onPickVariationImages = () => {
    variationFileInputRef.current?.click();
  };

  const onVariationImagesSelected = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;

    setVariationImageFiles((prev) => [...prev, ...files]);

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setVariationImagePreviews((prev) => [
          ...prev,
          e.target?.result as string,
        ]);
      };
      reader.readAsDataURL(file);
    });

    event.target.value = "";
  };

  const onRemoveVariationImage = (index: number) => {
    setVariationImageFiles((prev) => prev.filter((_, i) => i !== index));
    setVariationImagePreviews((prev) => prev.filter((_, i) => i !== index));

    if (selectedVariationImageIndex >= variationImagePreviews.length - 1) {
      setSelectedVariationImageIndex(
        Math.max(0, variationImagePreviews.length - 2),
      );
    }
  };

  const onAddVariation = () => {
    if (!variationColor.trim() || !variationSize.trim()) {
      toast.error("Informe a cor e o tamanho da variação.");
      return;
    }

    if (!variationStock.trim()) {
      toast.error("Informe o estoque da variação.");
      return;
    }

    const stockValue = Number(variationStock);
    if (!Number.isInteger(stockValue) || stockValue < 0) {
      toast.error("O estoque da variação deve ser um número inteiro positivo.");
      return;
    }

    if (variationPrice.trim()) {
      const priceValue = Number(variationPrice.replace(",", "."));
      if (isNaN(priceValue)) {
        toast.error("Informe um preço válido para a variação.");
        return;
      }
      if (priceValue < 0) {
        toast.error("O preço da variação não pode ser negativo.");
        return;
      }
    }

    if (variationLowStockAlertEnabled) {
      const lowStockValue = Number(variationLowStock);
      if (!Number.isInteger(lowStockValue) || lowStockValue <= 0) {
        toast.error(
          "O estoque mínimo da variação deve ser um número inteiro maior que zero.",
        );
        return;
      }
    }

    const duplicate = variations.some(
      (v, i) =>
        v.color === variationColor.trim() &&
        v.size === variationSize.trim() &&
        i !== editingVariationIndex,
    );

    if (duplicate) {
      toast.error(
        `Já existe uma variação com a cor ${variationColor} e tamanho ${variationSize}. Escolha uma combinação diferente.`,
      );
      return;
    }

    const targetIndex = editingVariationIndex;

    const newVariation: ProductVariationRequestDto = {
      name: `${variationColor.trim()} ${variationSize.trim()}`,
      price: variationPrice.trim()
        ? Number(variationPrice.replace(",", "."))
        : 0,
      stock:
        variationStock && !isNaN(Number(variationStock)) ? stockValue : 0,
      color: variationColor.trim(),
      size: variationSize.trim(),
      isActive: variationIsActive,
      activeLowStock: variationLowStockAlertEnabled,
      lowStock:
        variationLowStockAlertEnabled &&
        variationLowStock &&
        !isNaN(Number(variationLowStock))
          ? Number(variationLowStock)
          : 0,
      images:
        variationImageFiles.length > 0 ? variationImageFiles : undefined,
      imageUrl:
        variationImageFiles.length === 0 && targetIndex !== null
          ? variations[targetIndex].imageUrl
          : undefined,
    };

    if (targetIndex !== null) {
      setVariations((prev) => {
        const updated = [...prev];
        updated[targetIndex] = newVariation;
        return updated;
      });
    } else {
      setVariations((prev) => [...prev, newVariation]);
    }

    onCloseVariationForm();
  };

  const onRemoveVariation = (index: number) => {
    setVariations(variations.filter((_, i) => i !== index));
  };

  const toDot = (value: string) =>
    value.replace(/\./g, "").replace(",", ".").trim();

  const onSave = async () => {
    if (saving) return;

    if (!name.trim()) {
      toast.error("Informe o nome do produto.");
      return;
    }

    if (productType === ProductType.UNIQUE) {
      if (!price.trim()) {
        toast.error("Informe o preço do produto.");
        return;
      }
      const priceValue = Number(toDot(price));
      if (isNaN(priceValue)) {
        toast.error("Informe um preço válido.");
        return;
      }
      if (priceValue < 0) {
        toast.error("O preço não pode ser negativo.");
        return;
      }
      if (!color.trim()) {
        toast.error("Selecione a cor do produto.");
        return;
      }
      if (!stock.trim()) {
        toast.error("Informe a quantidade em estoque.");
        return;
      }
      const stockValue = Number(stock);
      if (!Number.isInteger(stockValue) || stockValue < 0) {
        toast.error("O estoque deve ser um número inteiro positivo.");
        return;
      }
      if (activeLowStock) {
        const lowStockValue = Number(lowStock);
        if (!Number.isInteger(lowStockValue) || lowStockValue < 0) {
          toast.error("O estoque mínimo deve ser um número inteiro positivo.");
          return;
        }
      }
    } else if (variations.length === 0) {
      toast.error("Adicione pelo menos uma variação ao produto.");
      return;
    }

    if (promoPrice.trim() && productType === ProductType.UNIQUE) {
      const promoValue = Number(toDot(promoPrice));
      const priceValue = Number(toDot(price));
      if (isNaN(promoValue)) {
        toast.error("Informe um preço promocional válido.");
        return;
      }
      if (promoValue < 0) {
        toast.error("O preço promocional não pode ser negativo.");
        return;
      }
      if (promoValue >= priceValue) {
        toast.error("O preço promocional deve ser menor que o preço normal.");
        return;
      }
    }

    // Clean variations: keep ONLY fields expected by backend
    // Remove: id, createdAt, updatedAt, createdBy, updatedBy, etc
    const cleanVariations: ProductVariationRequestDto[] | undefined =
      productType === ProductType.VARIATION && variations.length > 0
        ? variations.map((variation) => {
            let priceValue: number = 0;
            if (variation.price !== undefined && variation.price !== null) {
              priceValue =
                typeof variation.price === "string"
                  ? Number((variation.price as string).replace(",", "."))
                  : Number(variation.price);
            }
            return {
              name: variation.name ?? undefined,
              price: priceValue,
              stock:
                variation.stock !== undefined && variation.stock !== null
                  ? Number(variation.stock)
                  : 0,
              isActive: variation.isActive ?? true,
              color: variation.color ?? "",
              size: variation.size ?? "",
              images: variation.images?.filter(
                (image): image is File => image instanceof File,
              ),
              imageUrl: variation.imageUrl ?? undefined,
              activeLowStock: !!variation.activeLowStock,
              lowStock:
                variation.lowStock !== undefined && variation.lowStock !== null
                  ? Number(variation.lowStock)
                  : 0,
            };
          })
        : undefined;
    const payload: ProductRequest = {
      name: name.trim(),
      description: description.trim() || undefined,
      category,
      status,
      promoPrice:
        productType === ProductType.UNIQUE && promoPrice.trim()
          ? Number(toDot(promoPrice))
          : null,
      activeLowStock:
        productType === ProductType.UNIQUE ? activeLowStock : false,
      lowStock:
        productType === ProductType.UNIQUE &&
        activeLowStock &&
        lowStock &&
        !isNaN(Number(lowStock))
          ? Number(lowStock)
          : 0,
      variations:
        productType === ProductType.VARIATION ? cleanVariations : [],
      imageIds:
        isEdit
          ? productType === ProductType.UNIQUE
            ? existingImageIds
            : []
          : undefined,
      supplierId: supplierId.trim() || (isEdit ? null : undefined),
    };

    if (productType === ProductType.UNIQUE) {
      payload.price = price.trim() ? Number(toDot(price)) : 0;
      payload.color = color.trim() || undefined;
      payload.size = size.trim() || undefined;
      payload.stock = stock && !isNaN(Number(stock)) ? Number(stock) : 0;
    } else if (productType === ProductType.VARIATION) {
      payload.price = null;
      payload.color = null;
      payload.size = null;
      payload.stock = null;
      payload.promoPrice = null;
    }

    try {
      setSaving(true);
      const productImages =
        productType === ProductType.UNIQUE && imageFiles.length > 0
          ? imageFiles
          : undefined;
      if (isEdit && id) {
        await ProductService.update(id, payload, productImages);
        toast.success("Produto atualizado com sucesso.");
        navigate(-1);
        return;
      }
      await ProductService.create(payload, productImages);
      toast.success("Produto criado com sucesso.");
      navigate(-1);
    } catch {
      toast.error(
        isEdit
          ? "Não foi possível atualizar o produto. Confira os campos e tente novamente."
          : "Não foi possível criar o produto. Confira os campos e tente novamente.",
      );
    } finally {
      setSaving(false);
    }
  };

  const actionLabel = isEdit ? "Salvar alterações" : "Criar produto";
  const loadingLabel = isEdit ? "Salvando..." : "Criando...";

  const SIZES = ["P", "M", "G", "GG", "XG", "36", "38", "40", "42", "44", "46"];
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
      <input
        ref={variationFileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={onVariationImagesSelected}
      />

      <div className={styles.top}>
        <div className={styles.heading}>
          <ButtonBack />
          <div>
            <h1 className={styles.title}>
              {isEdit ? "Editar produto" : "Cadastro de novo produto"}
            </h1>
            <p className={styles.subtitle}>
              {isEdit
                ? "Atualize as informações principais do produto."
                : "Preencha as informações principais do produto."}
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
            disabled={saving || loadingProduct}
          >
            <Save size={16} />
            {saving ? loadingLabel : actionLabel}
          </button>
        </div>
      </div>

      <div
        className={`${styles.content} ${
          productType === ProductType.VARIATION ? styles.contentWide : ""
        }`}
      >
        {productType === ProductType.UNIQUE && (
          <aside className={styles.imageGalleryAside}>
            <ImageGallery
              className={styles.productGallery}
              previews={imagePreviews}
              selectedIndex={selectedImageIndex}
              imageNames={imageNames}
              onSelectImage={setSelectedImageIndex}
              onAddImages={onPickImages}
              onRemoveImage={onRemoveImage}
            />
          </aside>
        )}

        <div className={styles.formColumn}>
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.panelTitle}>Informações do produto</span>
                <p className={styles.panelDescription}>
                  Dados usados no catálogo e no controle de estoque.
                </p>
              </div>
            </div>

            <div className={styles.form}>
              <div className={styles.field}>
                <span className={styles.label}>Tipo de produto</span>
                <div className={styles.typeSelector}>
                  <button
                    type="button"
                    className={`${styles.typeOption} ${
                      productType === ProductType.UNIQUE
                        ? styles.typeOptionActive
                        : ""
                    }`}
                    onClick={() => onProductTypeChange(ProductType.UNIQUE)}
                    aria-pressed={productType === ProductType.UNIQUE}
                  >
                    Produto único
                  </button>
                  <button
                    type="button"
                    className={`${styles.typeOption} ${
                      productType === ProductType.VARIATION
                        ? styles.typeOptionActive
                        : ""
                    }`}
                    onClick={() => onProductTypeChange(ProductType.VARIATION)}
                    aria-pressed={productType === ProductType.VARIATION}
                  >
                    Com variações
                  </button>
                </div>
                <span className={styles.fieldHint}>
                  Use variações quando o item tiver combinações de cor ou tamanho.
                </span>
              </div>

              <label className={styles.field}>
                <span className={styles.label}>Nome *</span>
                <input
                  className={styles.input}
                  placeholder="Ex: Camisa social"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={180}
                  disabled={loadingProduct}
                />
              </label>

              <label className={styles.field}>
                <span className={styles.label}>Descrição</span>
                <textarea
                  className={styles.textarea}
                  placeholder="Descreva o produto"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  disabled={loadingProduct}
                />
              </label>

              <div className={styles.row2}>
                <label className={styles.field}>
                  <span className={styles.label}>Categoria</span>
                  <select
                    className={styles.select}
                    value={category}
                    onChange={(event) =>
                      setCategory(event.target.value as ProductCategoryEnum)
                    }
                    disabled={loadingProduct}
                  >
                    {categoryOptions.map((option) => (
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
                    onChange={(event) =>
                      setStatus(event.target.value as ProductStatusEnum)
                    }
                    disabled={loadingProduct}
                  >
                    {statusOptions.map((option) => (
                      <option key={option} value={option}>
                        {getStatusLabel(option)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className={styles.field}>
                <span className={styles.label}>Fornecedor</span>
                <select
                  className={styles.select}
                  value={supplierId}
                  onChange={(event) => setSupplierId(event.target.value)}
                  disabled={loadingSuppliers || loadingProduct}
                >
                  <option value="">
                    {loadingSuppliers
                      ? "Carregando fornecedores..."
                      : "Sem fornecedor vinculado"}
                  </option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </label>

              {productType === ProductType.UNIQUE && (
                <>
                  <div className={styles.row2}>
                    <div className={styles.field}>
                      <span className={styles.label}>Cor *</span>
                      {isEdit && !editingColor ? (
                        <div className={styles.colorSwatches}>
                          {color && (
                            <span
                              className={`${styles.colorSwatch} ${styles.colorSwatchActive}`}
                              style={{ background: color }}
                            />
                          )}
                          {color && (
                            <span className={styles.colorHexLabel}>
                              {color}
                            </span>
                          )}
                          <button
                            type="button"
                            className={styles.changeColorBtn}
                            onClick={() => setEditingColor(true)}
                          >
                            {color ? "Alterar cor" : "Selecionar cor"}
                          </button>
                        </div>
                      ) : (
                        <div className={styles.colorSwatches}>
                          {PRODUCT_COLORS.map((c) => (
                            <button
                              key={c.hex}
                              type="button"
                              title={c.label}
                              className={`${styles.colorSwatch} ${
                                color === c.hex ? styles.colorSwatchActive : ""
                              }`}
                              style={{ background: c.hex }}
                              onClick={() =>
                                setColor(color === c.hex ? "" : c.hex)
                              }
                            />
                          ))}
                          <div className={styles.colorPickerWrapper}>
                            <button
                              type="button"
                              title="Cor personalizada"
                              className={`${styles.colorSwatch} ${styles.colorSwatchCustom} ${
                                color &&
                                !PRODUCT_COLORS.some((c) => c.hex === color)
                                  ? styles.colorSwatchActive
                                  : ""
                              }`}
                              style={{
                                background:
                                  color &&
                                  !PRODUCT_COLORS.some((c) => c.hex === color)
                                    ? color
                                    : undefined,
                              }}
                              onClick={() => setShowColorPicker((v) => !v)}
                            >
                              {!(
                                color &&
                                !PRODUCT_COLORS.some((c) => c.hex === color)
                              ) && (
                                <span className={styles.colorSwatchCustomIcon}>
                                  +
                                </span>
                              )}
                            </button>
                            {showColorPicker && (
                              <div className={styles.colorPickerPopover}>
                                <input
                                  ref={colorPickerRef}
                                  type="color"
                                  className={styles.colorPickerNative}
                                  value={color || "#000000"}
                                  onChange={(e) => setColor(e.target.value)}
                                />
                                <button
                                  type="button"
                                  className={styles.colorPickerConfirm}
                                  onClick={() => setShowColorPicker(false)}
                                >
                                  OK
                                </button>
                              </div>
                            )}
                          </div>
                          {color && (
                            <span className={styles.colorHexLabel}>
                              {color}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* <label className={styles.field}>
                      <span className={styles.label}>Tamanho</span>
                      <input
                        className={styles.input}
                        placeholder="Ex: M, G, 42"
                        value={size}
                        onChange={(event) => setSize(event.target.value)}
                      />
                    </label> */}
                    <div className={styles.fieldGroup}>
                      <label className={styles.label}>TAMANHO</label>
                      <select
                        className={styles.select}
                        value={size}
                        onChange={(e) => setSize(e.target.value)}
                      >
                        {SIZES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className={styles.row2}>
                    <label className={styles.field}>
                      <span className={styles.label}>Preço *</span>
                      <input
                        className={styles.input}
                        placeholder="R$ 0,00"
                        value={price}
                        onChange={handlePriceChange}
                        inputMode="numeric"
                      />
                    </label>
                    <label className={styles.field}>
                      <span className={styles.label}>Preço promocional</span>
                      <input
                        className={styles.input}
                        placeholder="R$ 0,00"
                        value={promoPrice}
                        onChange={handlePromoPriceChange}
                        inputMode="numeric"
                      />
                    </label>
                  </div>

                  <div className={styles.row2}>
                    <label className={styles.field}>
                      <span className={styles.label}>Estoque *</span>
                      <input
                        className={styles.input}
                        placeholder="0"
                        value={stock}
                        onChange={(e) =>
                          setStock(e.target.value.replace(/\D/g, ""))
                        }
                        inputMode="numeric"
                        pattern="[0-9]*"
                      />
                    </label>

                    <div className={styles.field}>
                      <div className={styles.fieldHeader}>
                        <span className={styles.label}>
                          Estoque baixo (alerta)
                        </span>
                        <button
                          type="button"
                          className={`${styles.toggleSwitch} ${
                            activeLowStock ? styles.toggleSwitchActive : ""
                          }`}
                          onClick={() => setActiveLowStock(!activeLowStock)}
                        >
                          <span className={styles.toggleSlider} />
                        </button>
                      </div>
                      {activeLowStock && (
                        <input
                          className={styles.input}
                          placeholder="0"
                          value={lowStock}
                          onChange={(event) =>
                            setLowStock(event.target.value.replace(/\D/g, ""))
                          }
                          inputMode="numeric"
                        />
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>

          {productType === ProductType.VARIATION && (
            <section className={`${styles.panel} ${styles.variationPanel}`}>
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.panelTitle}>Variações do produto</span>
                  <p className={styles.panelDescription}>
                    Cadastre cada combinação disponível de cor e tamanho.
                  </p>
                </div>
                {!expandedVariationForm && (
                  <button
                    type="button"
                    className={styles.addVariationBtn}
                    onClick={onOpenVariationForm}
                  >
                    <Plus size={18} />
                    Adicionar variação
                  </button>
                )}
              </div>

              <div className={styles.form}>
                {expandedVariationForm && (
                  <div className={styles.variationFormCard}>
                    <div className={styles.variationFormHeader}>
                      <div>
                        <span className={styles.variationFormEyebrow}>
                          {editingVariationIndex !== null
                            ? "Editando combinação"
                            : "Nova combinação"}
                        </span>
                        <h3 className={styles.variationFormTitle}>
                          {editingVariationIndex !== null
                            ? "Editar variação"
                            : "Adicionar variação"}
                        </h3>
                        <p className={styles.variationFormSubtitle}>
                          Organize a identificação, o preço e o estoque desta
                          opção do produto.
                        </p>
                      </div>
                      <button
                        type="button"
                        className={styles.closeVariationBtn}
                        onClick={onCloseVariationForm}
                        aria-label="Fechar formulário da variação"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    <div className={styles.variationFormBody}>
                      <div className={styles.variationCardContent}>
                        <div className={styles.variationImageColumn}>
                          <ImageGallery
                            className={styles.variationGallery}
                            label="Imagem da variação"
                            previews={variationImagePreviews}
                            selectedIndex={selectedVariationImageIndex}
                            imageNames={[]}
                            onSelectImage={setSelectedVariationImageIndex}
                            onAddImages={onPickVariationImages}
                            onRemoveImage={onRemoveVariationImage}
                          />
                        </div>

                        <div className={styles.variationInfoColumn}>
                          <section className={styles.variationSection}>
                            <div className={styles.variationSectionHeader}>
                              <span className={styles.variationStep}>1</span>
                              <div>
                                <strong>Características</strong>
                                <small>Defina a cor e o tamanho da opção.</small>
                              </div>
                            </div>
                            <div className={styles.variationInfoRow}>
                              <div className={styles.field}>
                                <span className={styles.label}>Cor *</span>
                                <div className={styles.colorSwatches}>
                                  {PRODUCT_COLORS.map((c) => (
                                    <button
                                      key={c.hex}
                                      type="button"
                                      title={c.label}
                                      className={`${styles.colorSwatch} ${
                                        variationColor === c.hex
                                          ? styles.colorSwatchActive
                                          : ""
                                      }`}
                                      style={{ background: c.hex }}
                                      onClick={() =>
                                        setVariationColor(
                                          variationColor === c.hex ? "" : c.hex,
                                        )
                                      }
                                    />
                                  ))}
                                  <div className={styles.colorPickerWrapper}>
                                    <button
                                      type="button"
                                      title="Cor personalizada"
                                      className={`${styles.colorSwatch} ${styles.colorSwatchCustom} ${
                                        variationColor &&
                                        !PRODUCT_COLORS.some(
                                          (c) => c.hex === variationColor,
                                        )
                                          ? styles.colorSwatchActive
                                          : ""
                                      }`}
                                      style={{
                                        background:
                                          variationColor &&
                                          !PRODUCT_COLORS.some(
                                            (c) => c.hex === variationColor,
                                          )
                                            ? variationColor
                                            : undefined,
                                      }}
                                      onClick={() =>
                                        setShowVariationColorPicker((v) => !v)
                                      }
                                    >
                                      {!(
                                        variationColor &&
                                        !PRODUCT_COLORS.some(
                                          (c) => c.hex === variationColor,
                                        )
                                      ) && (
                                        <span
                                          className={styles.colorSwatchCustomIcon}
                                        >
                                          +
                                        </span>
                                      )}
                                    </button>
                                    {showVariationColorPicker && (
                                      <div
                                        className={styles.colorPickerPopover}
                                      >
                                        <input
                                          type="color"
                                          className={styles.colorPickerNative}
                                          value={variationColor || "#000000"}
                                          onChange={(e) =>
                                            setVariationColor(e.target.value)
                                          }
                                        />
                                        <button
                                          type="button"
                                          className={styles.colorPickerConfirm}
                                          onClick={() =>
                                            setShowVariationColorPicker(false)
                                          }
                                        >
                                          OK
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <label className={styles.field}>
                                <span className={styles.label}>Tamanho *</span>
                                <input
                                  className={styles.input}
                                  placeholder="Ex: M, G ou 42"
                                  value={variationSize}
                                  onChange={(event) =>
                                    setVariationSize(event.target.value)
                                  }
                                  maxLength={50}
                                />
                              </label>
                            </div>
                          </section>

                          <section className={styles.variationSection}>
                            <div className={styles.variationSectionHeader}>
                              <span className={styles.variationStep}>2</span>
                              <div>
                                <strong>Preço e estoque</strong>
                                <small>
                                  Controle o valor e a disponibilidade.
                                </small>
                              </div>
                            </div>
                            <div className={styles.variationStockRow}>
                              <label className={styles.field}>
                                <span className={styles.label}>
                                  Preço (opcional)
                                </span>
                                <input
                                  className={styles.input}
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  placeholder="0,00"
                                  value={variationPrice}
                                  onChange={(e) =>
                                    setVariationPrice(e.target.value)
                                  }
                                />
                              </label>
                              <label className={styles.field}>
                                <span className={styles.label}>Estoque *</span>
                                <input
                                  className={styles.input}
                                  placeholder="0"
                                  value={variationStock}
                                  onChange={(e) =>
                                    setVariationStock(
                                      e.target.value.replace(/\D/g, ""),
                                    )
                                  }
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                />
                              </label>
                              <div className={styles.alertField}>
                                <div className={styles.alertFieldHeader}>
                                  <div>
                                    <span className={styles.label}>
                                      Alerta de estoque
                                    </span>
                                    <span className={styles.fieldHint}>
                                      Avise quando estiver acabando.
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    className={`${styles.toggleSwitch} ${variationLowStockAlertEnabled ? styles.toggleSwitchActive : ""}`}
                                    onClick={() =>
                                      setVariationLowStockAlertEnabled(
                                        (enabled) => {
                                          if (!enabled && !variationLowStock) {
                                            setVariationLowStock("5");
                                          }
                                          return !enabled;
                                        },
                                      )
                                    }
                                    aria-pressed={
                                      variationLowStockAlertEnabled
                                    }
                                  >
                                    <span className={styles.toggleSlider} />
                                  </button>
                                </div>
                                {variationLowStockAlertEnabled && (
                                  <input
                                    className={styles.input}
                                    placeholder="Estoque mínimo"
                                    value={variationLowStock}
                                    onChange={(e) =>
                                      setVariationLowStock(
                                        e.target.value.replace(/\D/g, ""),
                                      )
                                    }
                                    inputMode="numeric"
                                  />
                                )}
                              </div>
                            </div>
                          </section>

                          <section className={styles.variationSection}>
                            <div className={styles.variationSectionHeader}>
                              <span className={styles.variationStep}>3</span>
                              <div>
                                <strong>Disponibilidade</strong>
                                <small>
                                  Defina se esta opção pode ser vendida.
                                </small>
                              </div>
                            </div>
                            <label
                              className={`${styles.field} ${styles.statusField}`}
                            >
                              <span className={styles.label}>Status</span>
                              <select
                                className={styles.select}
                                value={variationIsActive ? "true" : "false"}
                                onChange={(event) =>
                                  setVariationIsActive(
                                    event.target.value === "true",
                                  )
                                }
                              >
                                <option value="true">Ativo</option>
                                <option value="false">Inativo</option>
                              </select>
                            </label>
                          </section>
                        </div>
                      </div>
                    </div>

                    <div className={styles.variationFormFooter}>
                      <button
                        type="button"
                        className={styles.cancelBtn}
                        onClick={onCloseVariationForm}
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        className={styles.addBtn}
                        onClick={onAddVariation}
                      >
                        {editingVariationIndex !== null
                          ? "Salvar alteração"
                          : "Adicionar"}
                      </button>
                    </div>
                  </div>
                )}

                {!expandedVariationForm && variations.length === 0 && (
                  <div className={styles.variationEmptyState}>
                    <div className={styles.variationEmptyIcon}>
                      <Plus size={22} />
                    </div>
                    <strong>Nenhuma variação cadastrada</strong>
                    <span>
                      Adicione a primeira combinação de cor e tamanho deste
                      produto.
                    </span>
                  </div>
                )}

                {variations.length > 0 && (
                  <div className={styles.variationsList}>
                    {variations.map((variation, index) => {
                      const imgs = variation.images ?? [];
                      const imageUrl = imgs.map((img) =>
                        img instanceof File
                          ? {
                              id: "",
                              fileName: "",
                              url: URL.createObjectURL(img),
                              isPrimary: false,
                            }
                          : {
                              id: img.id || "",
                              fileName: img.fileName || "",
                              url: img.url || "",
                              isPrimary: false,
                            },
                      );
                      if (imageUrl.length === 0 && variation.imageUrl) {
                        imageUrl.push({
                          id: "",
                          fileName: variation.name ?? "",
                          url: variation.imageUrl,
                          isPrimary: false,
                        });
                      }
                      return (
                        <div
                          key={index}
                          className={styles.variationCardWrapper}
                          style={{ position: "relative" }}
                          onMouseEnter={(e) => {
                            const el = (
                              e.currentTarget as HTMLElement
                            ).querySelector(
                              ".variation-actions-hover",
                            ) as HTMLElement;
                            if (el) {
                              el.style.opacity = "1";
                              el.style.pointerEvents = "auto";
                            }
                          }}
                          onMouseLeave={(e) => {
                            const el = (
                              e.currentTarget as HTMLElement
                            ).querySelector(
                              ".variation-actions-hover",
                            ) as HTMLElement;
                            if (el) {
                              el.style.opacity = "0";
                              el.style.pointerEvents = "none";
                            }
                          }}
                        >
                          <div
                            className="variation-actions-hover"
                            style={{
                              position: "absolute",
                              top: 12,
                              right: 12,
                              display: "flex",
                              gap: 6,
                              zIndex: 2,
                              opacity: 0,
                              pointerEvents: "none",
                              transition: "opacity 0.15s",
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => onRemoveVariation(index)}
                              aria-label="Deletar variação"
                              style={{
                                color: "#fff",
                                background: "#ef4444",
                                border: "none",
                                cursor: "pointer",
                                padding: 2,
                                width: 32,
                                height: 32,
                                borderRadius: 8,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <FiTrash2 size={18} />
                            </button>
                            <button
                              type="button"
                              onClick={() => onEditVariation(index)}
                              aria-label="Editar variação"
                              style={{
                                color: "var(--text-secondary)",
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                padding: 2,
                                width: 32,
                                height: 32,
                                borderRadius: 8,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <Pencil size={18} />
                            </button>
                          </div>
                          <EntityCard
                            id={String(index)}
                            name={
                              variation.name ||
                              `${variation.color ?? ""} ${variation.size ?? ""}`.trim() ||
                              `Variação ${index + 1}`
                            }
                            description={undefined}
                            category={category}
                            price={
                              variation.price !== undefined &&
                              variation.price !== null
                                ? Number(variation.price)
                                : 0
                            }
                            imageUrl={imageUrl}
                            stock={
                              variation.stock !== undefined &&
                              variation.stock !== null
                                ? Number(variation.stock)
                                : 0
                            }
                            lowStock={0}
                            available
                            color={variation.color ?? undefined}
                            size={variation.size ?? undefined}
                            status={
                              variation.isActive !== false
                                ? ProductStatusEnum.ACTIVED
                                : ProductStatusEnum.DISABLED
                            }
                            navigateTo=""
                            onEdit={() => onEditVariation(index)}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
