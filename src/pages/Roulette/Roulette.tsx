import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { PrizesService } from "../../service/prizes.service";
import type { PrizeRequestDto } from "../../dtos/request/prize-request.dto";
import type { PrizeResponseDto } from "../../dtos/response/prize-response.dto";
import styles from "./Roulette.module.css";
import { FiTrash2 } from "react-icons/fi";
import { Edit2 } from "lucide-react";
import { ConfirmDeleteModal } from "../../components/ConfirmaDeleteModal/ConfirmDeleteModal";
import { ProductService } from "../../service/Product.service";
import type { ProductResponse } from "../../dtos/response/product-response.dto";
import EntityCard from "../../components/EntityCard/EntityCard";
import { CustomSelect } from "../../components/CustomSelect/CustomSelect";
import { FiSearch, FiFilter } from "react-icons/fi";
import { FilterModal } from "../../components/FilterModal/FilterModal";
import type { CategoryKey } from "../../types/Product-type";

const WHEEL_SIZE = 260;

export default function RouletteAdmin() {
  const [products, setProducts] = useState<ProductResponse[]>([]);

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [editValues, setEditValues] = useState<Partial<PrizeRequestDto>>({});
  const [createValues, setCreateValues] = useState<"new" | "not">("not");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [activeCat, setActiveCat] = useState<CategoryKey>("all");
  type SortOption = "price-asc" | "price-desc" | "name-asc" | null;
  const [filters, setFilters] = useState<{
    minPrice: string;
    maxPrice: string;
    category: CategoryKey;
    sortBy: SortOption;
  }>({
    minPrice: "",
    maxPrice: "",
    category: "all",
    sortBy: null,
  });

  const CATEGORIES: { key: CategoryKey; label: string }[] = useMemo(
    () => [
      { key: "all", label: `Todos ${products.length}` },
      { key: "shirt", label: "Camisa" },
      { key: "tshirt", label: "Camiseta" },
      { key: "polo", label: "Polo" },
      { key: "shorts", label: "Shorts" },
      { key: "jacket", label: "Jaqueta" },
      { key: "pants", label: "Calça" },
      { key: "dress", label: "Vestido" },
      { key: "sweater", label: "Suéter" },
      { key: "hoodie", label: "Moletom" },
      { key: "underwear", label: "Cueca" },
      { key: "footwear", label: "Calçado" },
      { key: "belt", label: "Cinto" },
      { key: "wallet", label: "Carteira" },
      { key: "sunglasses", label: "Óculos" },
    ],
    [products.length],
  );
  const LISTPAG = useMemo(
    () => [{ value: 12 }, { value: 24 }, { value: 48 }, { value: 100 }],
    [],
  );

  const filtered = useMemo(() => {
    let current = products;
    const categoryToFilter =
      filters.category !== "all" ? filters.category : activeCat;
    if (categoryToFilter !== "all") {
      current = current.filter((p: ProductResponse) => {
        return String(p.category) === String(categoryToFilter);
      });
    }
    const trimmed = query.trim().toLowerCase();
    if (trimmed) {
      current = current.filter(
        (p: ProductResponse) =>
          p.name.toLowerCase().includes(trimmed) ||
          (p.id && p.id.toLowerCase().includes(trimmed)),
      );
    }
    if (filters.minPrice) {
      const min = parseFloat(filters.minPrice);
      current = current.filter((p: ProductResponse) => Number(p.price) >= min);
    }
    if (filters.maxPrice) {
      const max = parseFloat(filters.maxPrice);
      current = current.filter((p: ProductResponse) => Number(p.price) <= max);
    }
    if (filters.sortBy === "price-asc") {
      current = [...current].sort(
        (a: ProductResponse, b: ProductResponse) =>
          Number(a.price) - Number(b.price),
      );
    } else if (filters.sortBy === "price-desc") {
      current = [...current].sort(
        (a: ProductResponse, b: ProductResponse) =>
          Number(b.price) - Number(a.price),
      );
    } else if (filters.sortBy === "name-asc") {
      current = [...current].sort((a: ProductResponse, b: ProductResponse) =>
        a.name.localeCompare(b.name),
      );
    }
    return current;
  }, [products, query, filters, activeCat]);
  const total = filtered.length;
  const maxPage = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, maxPage);
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);
  const pages = Array.from({ length: maxPage }, (_, index) => index + 1);

  const handleEditClick = (idx: number) => {
    setEditingIndex(idx);
    setEditValues({ ...prizesBack[idx] });
  };

  const handleEditChange = (
    field: keyof PrizeRequestDto,
    value: PrizeRequestDto[keyof PrizeRequestDto],
  ) => {
    setEditValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleEditCancel = () => {
    setEditingIndex(null);
    setEditValues({});
  };

  const handleEditSave = async () => {
    if (editingIndex === null) return;
    const prize = prizesBack[editingIndex] as PrizeResponseDto & {
      id?: string;
    };
    if (!("id" in prize) || !prize.id) return;
    try {
      // Garantir que editValues está completo para PrizeRequestDto
      const data: PrizeRequestDto = {
        name: editValues.name || prize.name,
        description: editValues.description ?? prize.description ?? "",
        imageUrl: editValues.imageUrl ?? prize.imageUrl ?? "",
        quantity: editValues.quantity ?? prize.quantity,
        probability: editValues.probability ?? prize.probability,
        active: editValues.active ?? prize.active,
      };
      await PrizesService.update(prize.id, data);
      const updated = [...prizesBack];
      updated[editingIndex] = { ...updated[editingIndex], ...data };
      setPrizesBack(updated);
    } catch {
      alert("Erro ao atualizar prêmio. Tente novamente.");
    }
    setEditingIndex(null);
    setEditValues({});
  };

  const [productTab, setProductTab] = useState<"create" | "products">("create");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [prizes, setPrizes] = useState<PrizeRequestDto[]>([]);
  // prizesBack agora é PrizeResponseDto & { id?: string }
  const [prizesBack, setPrizesBack] = useState<
    (PrizeResponseDto & { id?: string })[]
  >([]);

  useEffect(() => {
    const findAllProducts = async () => {
      try {
        const data = await ProductService.findAll();
        setProducts(Array.isArray(data) ? data : []);
      } catch {
        setProducts([]);
      }
    };
    findAllProducts();
  }, []);
  const drawWheel = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Usar prizesBack para a pré-visualização
    const previewList = prizesBack;
    const radius = WHEEL_SIZE / 2;
    const arc = previewList.length > 0 ? (2 * Math.PI) / previewList.length : 0;

    ctx.clearRect(0, 0, WHEEL_SIZE, WHEEL_SIZE);

    previewList.forEach((prize, i) => {
      const angle = i * arc;

      ctx.beginPath();
      ctx.fillStyle = i % 2 === 0 ? "#FFC107" : "#000";
      ctx.moveTo(radius, radius);
      ctx.arc(radius, radius, radius, angle, angle + arc);
      ctx.fill();

      ctx.save();
      ctx.translate(radius, radius);
      ctx.rotate(angle + arc / 2);
      ctx.fillStyle = i % 2 === 0 ? "#000" : "#fff";
      ctx.font = "bold 14px Inter";
      ctx.textAlign = "right";
      ctx.fillText(prize.name, radius - 10, 5);
      ctx.restore();
    });
  }, [prizesBack]);

  useEffect(() => {
    drawWheel();
  }, [drawWheel]);

  useEffect(() => {
    const fetchPrizes = async () => {
      const data = await PrizesService.findAll();
      setPrizesBack(Array.isArray(data) ? data : []);
    };
    fetchPrizes();
  }, []);

  const handlePrizeFieldChange = (
    i: number,
    field: keyof PrizeRequestDto,
    value: PrizeRequestDto[keyof PrizeRequestDto],
  ) => {
    const updated = [...prizes];
    updated[i] = { ...updated[i], [field]: value };
    setPrizes(updated);
  };

  const addPrize = () => {
    setPrizes([
      ...prizes,
      {
        name: "",
        description: "",
        imageUrl: "",
        quantity: 1,
        probability: 1,
        active: true,
      },
    ]);
  };

  const handleSaveConfig = async () => {
    setLoading(true);
    try {
      for (const prize of prizes) {
        const data = {
          ...prize,
          probability: Number(prize.probability),
        };
        await PrizesService.create(data);
      }
      setPrizes([]);
      setCreateValues("not");
      setProductTab("products");
    } catch {
      alert("Erro ao salvar prêmio. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // Remove prêmio do formulário de criação (não da lista principal)
  const removePrize = (i: number) => {
    setPrizes(prizes.filter((_, idx) => idx !== i));
  };

  // Deletar prêmio da API e atualizar lista
  const handleDeletePrize = useCallback(async () => {
    if (!deleteId) return;
    try {
      await PrizesService.delete(deleteId);
      setPrizesBack((prev) =>
        prev.filter((p) => String(p.id || "") !== String(deleteId)),
      );
      setIsDeleteModalOpen(false);
      setDeleteId(null);
    } catch {
      alert("Erro ao deletar prêmio. Tente novamente.");
    }
  }, [deleteId]);

  // Busca o nome do prêmio selecionado para deletar
  const prizeToDelete = prizesBack.find(
    (p) => String(p.id || "") === String(deleteId),
  );

  return (
    <div className={styles.rouletteRoot}>
      <div
        style={{
          background: "var(--surface)",
          borderRadius: 12,
          padding: 24,
          marginBottom: 32,
          boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
          textAlign: "center",
        }}
      >
        <h4 style={{ margin: 0 }}>Pré-visualização da Roleta</h4>
        {prizesBack.length > 0 ? (
          <canvas
            ref={canvasRef}
            width={WHEEL_SIZE}
            height={WHEEL_SIZE}
            style={{
              marginTop: 10,
            }}
          />
        ) : (
          <div style={{ marginTop: 20, color: "var(--text-muted)", fontSize: 15 }}>
            Register at least one prize to preview the roulette.
          </div>
        )}
        <p
          style={{
            fontSize: 12,
            color: "var(--text-muted)",
            marginTop: 10,
          }}
        >
          A roleta acima mostra exatamente como ficará para o cliente.
        </p>
        <button
          style={{
            width: 300,
            height: 38,
            background: "var(--highlight-primary)",
            border: "none",
            borderRadius: 99,
            fontWeight: 600,
            fontSize: 16,
            marginBottom: 10,
            boxShadow: "0 2px 8px rgba(255, 200, 61, 0.27)",
            cursor: "pointer",
          }}
        >
          <a
            href="https://giuseppe-vidal-roleta-16hm.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#ffffff", textDecoration: "none" }}
          >
            Acessar Roleta
          </a>
        </button>
      </div>
      {/* SELETOR DE PRODUTO/PRODUTOS */}
      <div style={{ marginBottom: 32 }}>
        <div
          style={{
            display: "flex",
            background: "var(--surface)",
            borderRadius: 32,
            width: 380,
            height: 37,
            alignItems: "center",
            position: "relative",
            padding: 1,
          }}
        >
          <button
            onClick={() => setProductTab("create")}
            style={{
              flex: 1,
              height: 30,
              border: "none",
              background:
                productTab === "create"
                  ? "var(--highlight-primary)"
                  : "transparent",
              color:
                productTab === "create" ? "#fff" : "var(--text-secondary)",
              fontWeight: 500,
              fontSize: 14,
              borderRadius: 32,
              cursor: "pointer",
              zIndex: 2,
              transition: "background 0.2s",
            }}
          >
            Adicionar Prêmios
          </button>
          <button
            onClick={() => setProductTab("products")}
            style={{
              flex: 1,
              height: 30,
              border: "none",
              background:
                productTab === "products"
                  ? "var(--highlight-primary)"
                  : "transparent",
              color:
                productTab === "products" ? "#fff" : "var(--text-secondary)",
              fontWeight: 500,
              fontSize: 14,
              borderRadius: 32,
              cursor: "pointer",
              marginLeft: -32,
              zIndex: 2,
              transition: "background 0.2s",
            }}
          >
            Produtos
          </button>
        </div>
      </div>
      {productTab === "products" && (
        <div style={{ marginBottom: 32 }}>
          <div
            style={{
              background: "var(--surface)",
              borderRadius: 12,
              boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
              padding: 0,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                fontWeight: 700,
                fontSize: 22,
                color: "var(--text-primary)",
                padding: "24px 24px 10px 24px",
              }}
            >
              Registered Products
            </div>
            <div style={{ width: "100%", overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  minWidth: 600,
                }}
              >
                <thead>
                  <tr
                    style={{
                      background: "var(--bg-primary)",
                      color: "var(--text-muted)",
                      fontWeight: 600,
                      fontSize: 15,
                    }}
                  >
                    <th style={{ padding: "12px 8px", textAlign: "left" }}>
                      Name
                    </th>
                    <th style={{ padding: "12px 8px", textAlign: "left" }}>
                      Description
                    </th>
                    <th style={{ padding: "12px 8px", textAlign: "left" }}>
                      Image
                    </th>
                    <th style={{ padding: "12px 8px", textAlign: "left" }}>
                      Quantity
                    </th>
                    <th style={{ padding: "12px 8px", textAlign: "left" }}>
                      Probability
                    </th>
                    <th style={{ padding: "12px 8px", textAlign: "left" }}>
                      Status
                    </th>
                    <th style={{ padding: "12px 8px", textAlign: "left" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {prizesBack.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        style={{
                          color: "var(--text-muted)",
                          textAlign: "center",
                          padding: 24,
                        }}
                      >
                        No products registered.
                      </td>
                    </tr>
                  )}
                  {prizesBack.map((p, i) =>
                    editingIndex === i ? (
                      <tr
                        key={i}
                        style={{
                          background:
                            i % 2 === 0
                              ? "var(--surface)"
                              : "var(--surface-muted)",
                        }}
                      >
                        <td style={{ padding: "12px 8px", fontWeight: 600 }}>
                          <input
                            value={editValues.name || ""}
                            onChange={(e) =>
                              handleEditChange("name", e.target.value)
                            }
                            style={{
                              padding: 6,
                              borderRadius: 4,
                              border: "1px solid var(--border-default)",
                              width: 100,
                            }}
                          />
                        </td>
                        <td style={{ padding: "12px 8px" }}>
                          <input
                            value={editValues.description || ""}
                            onChange={(e) =>
                              handleEditChange("description", e.target.value)
                            }
                            style={{
                              padding: 6,
                              borderRadius: 4,
                              border: "1px solid var(--border-default)",
                              width: 100,
                            }}
                          />
                        </td>
                        <td style={{ padding: "12px 8px" }}>
                          <input
                            value={editValues.imageUrl || ""}
                            onChange={(e) =>
                              handleEditChange("imageUrl", e.target.value)
                            }
                            style={{
                              padding: 6,
                              borderRadius: 4,
                              border: "1px solid var(--border-default)",
                              width: 120,
                            }}
                          />
                        </td>
                        <td style={{ padding: "12px 8px" }}>
                          <input
                            type="number"
                            value={editValues.quantity ?? 1}
                            min={1}
                            onChange={(e) =>
                              handleEditChange(
                                "quantity",
                                Number(e.target.value),
                              )
                            }
                            style={{
                              padding: 6,
                              borderRadius: 4,
                              border: "1px solid var(--border-default)",
                              width: 60,
                            }}
                          />
                        </td>
                        <td style={{ padding: "12px 8px" }}>
                          <input
                            type="number"
                            value={editValues.probability ?? 1}
                            min={1}
                            onChange={(e) =>
                              handleEditChange(
                                "probability",
                                Number(e.target.value),
                              )
                            }
                            style={{
                              padding: 6,
                              borderRadius: 4,
                              border: "1px solid var(--border-default)",
                              width: 60,
                            }}
                          />
                        </td>
                        <td style={{ padding: "12px 8px" }}>
                          <select
                            value={editValues.active ? "active" : "inactive"}
                            onChange={(e) =>
                              handleEditChange(
                                "active",
                                e.target.value === "active",
                              )
                            }
                            style={{
                              padding: 6,
                              borderRadius: 4,
                              border: "1px solid var(--border-default)",
                            }}
                          >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                          </select>
                        </td>
                        <td style={{ padding: "12px 4px", minWidth: 120 }}>
                          <button
                            onClick={handleEditSave}
                            style={{
                              background: "var(--status-success)",
                              border: "none",
                              color: "#fff",
                              borderRadius: 6,
                              padding: "4px 12px",
                              fontWeight: 600,
                              marginRight: 8,
                              cursor: "pointer",
                              fontSize: 14,
                              transition: "background 0.2s",
                            }}
                          >
                            Save
                          </button>
                          <button
                            onClick={handleEditCancel}
                            style={{
                              background: "var(--surface)",
                              border: "1px solid var(--status-danger)",
                              color: "var(--status-danger)",
                              borderRadius: 6,
                              padding: "4px 12px",
                              fontWeight: 600,
                              cursor: "pointer",
                              fontSize: 14,
                              transition: "background 0.2s",
                            }}
                          >
                            Cancel
                          </button>
                        </td>
                      </tr>
                    ) : (
                      <tr
                        key={i}
                        style={{
                          background:
                            i % 2 === 0
                              ? "var(--surface)"
                              : "var(--surface-muted)",
                        }}
                      >
                        <td style={{ padding: "12px 8px", fontWeight: 600 }}>
                          {p.name}
                        </td>
                        <td style={{ padding: "12px 8px" }}>{p.description}</td>
                        <td style={{ padding: "12px 8px" }}>
                          {p.imageUrl && (
                            <img
                              src={p.imageUrl}
                              alt={p.name}
                              style={{
                                width: 40,
                                height: 40,
                                objectFit: "cover",
                                borderRadius: 6,
                              }}
                            />
                          )}
                        </td>
                        <td style={{ padding: "12px 8px" }}>{p.quantity}</td>
                        <td style={{ padding: "12px 8px" }}>{p.probability}</td>
                        <td
                          style={{
                            padding: "12px 8px",
                            color: p.active
                              ? "var(--status-success)"
                              : "var(--status-danger)",
                            fontWeight: 600,
                          }}
                        >
                          {p.active ? "Active" : "Inactive"}
                        </td>
                        <td
                          style={{
                            padding: "12px 4px",
                            minWidth: 90,
                            display: "flex",
                            gap: 8,
                            alignItems: "center",
                          }}
                        >
                          <button
                            className={styles.iconBtn}
                            type="button"
                            aria-label="Excluir"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteId(p.id || null);
                              setIsDeleteModalOpen(true);
                            }}
                          >
                            <FiTrash2 size={15} />
                          </button>
                          <ConfirmDeleteModal
                            isOpen={isDeleteModalOpen}
                            title="Deseja remover este prêmio?"
                            itemName={prizeToDelete?.name || ""}
                            onClose={() => {
                              setIsDeleteModalOpen(false);
                              setDeleteId(null);
                            }}
                            onConfirm={handleDeletePrize}
                          />
                          <button
                            className={styles.iconBtnEdit}
                            type="button"
                            aria-label="Editar"
                            onClick={() => handleEditClick(i)}
                          >
                            <Edit2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {productTab === "create" && (
        <div
          style={{
            background: "var(--surface)",
            borderRadius: 12,
            padding: 24,
            marginBottom: 32,
            boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 18,
            }}
          >
            <h3 style={{ margin: 0, color: "var(--text-primary)" }}>Adicionar Prêmios</h3>
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 18,
              width: "100%",
              height: 400,
              alignItems: "center",
              justifyContent: prizes.length === 0 ? "center" : "flex-start",
            }}
          >
            {createValues === "not" && (
              <button
                onClick={() => {
                  setCreateValues("new");
                  addPrize();
                }}
                style={{
                  background: "var(--highlight-primary)",
                  border: "none",
                  width: 180,
                  height: 38,
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: 16,
                  color: "#ffffff",
                  boxShadow: "0 2px 8px rgba(255, 200, 61, 0.27)",
                  cursor: "pointer",
                  transition: "background 0.2s",
                }}
              >
                + Novo Prêmio
              </button>
            )}
            {createValues === "new" &&
              prizes.map((p, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 30,
                    marginBottom: 18,
                    border: "1px solid var(--border-default)",
                    borderRadius: 8,
                    padding: 14,
                    background: "var(--surface-muted)",
                    position: "relative",
                    width: "100%",
                    height: "100%",
                    boxShadow: "0 1px 4px rgba(255, 200, 61, 0.13)",
                  }}
                >
                  <button
                    onClick={() => removePrize(i)}
                    style={{
                      position: "absolute",
                      right: 8,
                      top: 8,
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      fontSize: 18,
                    }}
                  >
                    ✕
                  </button>

                  <input
                    placeholder="Prize Name"
                    value={p.name}
                    onChange={(e) =>
                      handlePrizeFieldChange(i, "name", e.target.value)
                    }
                    style={{
                      padding: 15,
                      borderRadius: 6,
                      border: "1px solid var(--border-default)",
                      marginTop: 50,
                      fontSize: 16,
                    }}
                  />
                  <input
                    placeholder="Description"
                    value={p.description}
                    onChange={(e) =>
                      handlePrizeFieldChange(i, "description", e.target.value)
                    }
                    style={{
                      padding: 15,
                      borderRadius: 6,
                      border: "1px solid var(--border-default)",
                      fontSize: 16,
                    }}
                  />
                  <input
                    placeholder="Image URL"
                    value={p.imageUrl}
                    onChange={(e) =>
                      handlePrizeFieldChange(i, "imageUrl", e.target.value)
                    }
                    style={{
                      padding: 15,
                      borderRadius: 6,
                      border: "1px solid var(--border-default)",
                      fontSize: 16,
                    }}
                  />
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      type="number"
                      placeholder="Quantity"
                      value={p.quantity}
                      min={1}
                      onChange={(e) =>
                        handlePrizeFieldChange(
                          i,
                          "quantity",
                          Number(e.target.value),
                        )
                      }
                      style={{
                        padding: 15,
                        borderRadius: 6,
                        border: "1px solid var(--border-default)",
                        width: 120,
                        fontSize: 16,
                      }}
                    />
                    <input
                      type="number"
                      placeholder="Probability"
                      value={p.probability}
                      min={1}
                      onChange={(e) =>
                        handlePrizeFieldChange(
                          i,
                          "probability",
                          Number(e.target.value),
                        )
                      }
                      style={{
                        padding: 10,
                        borderRadius: 6,
                        border: "1px solid var(--border-default)",
                        width: 120,
                      }}
                    />
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 13,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={p.active}
                        onChange={(e) =>
                          handlePrizeFieldChange(i, "active", e.target.checked)
                        }
                      />{" "}
                      Active
                    </label>
                  </div>
                </div>
              ))}
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
            <button
              onClick={handleSaveConfig}
              style={{
                background: "var(--highlight-primary)",
                color: "#fff",
                border: "none",
                padding: "12px 28px",
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 16,
                cursor: "pointer",
              }}
            >
              {loading ? "Carregando..." : "Adicionar"}
            </button>
          </div>
        </div>
      )}

      {/* SEÇÃO: PRODUTOS EM DESTAQUE (PADRÃO PRODUTOS) */}
      <div className={styles.gridContainer}>
        <div className={styles.filters}>
          <div className={styles.searchGroup}>
            <div className={styles.search}>
              <FiSearch className={styles.searchIcon} />
              <input
                className={styles.searchInput}
                type="text"
                placeholder="Buscar produtos..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <CustomSelect
              options={LISTPAG.map((c) => ({
                value: String(c.value),
                label: String(c.value),
              }))}
              value={String(pageSize)}
              onChange={(value: string) => {
                setPageSize(Number(value));
                setPage(1);
              }}
            />
          </div>
          <div className={styles.filterActions}>
            <CustomSelect
              options={CATEGORIES.map((c) => ({
                value: c.key,
                label: c.label,
              }))}
              value={activeCat}
              onChange={(value) => setActiveCat(value as CategoryKey)}
            />
            <div style={{ position: "relative" }}>
              <button
                className={styles.filterBtn}
                type="button"
                onClick={() => setIsFilterModalOpen(true)}
              >
                <FiFilter />
                Filtros
              </button>
              <FilterModal
                isOpen={isFilterModalOpen}
                onClose={() => setIsFilterModalOpen(false)}
                onApply={(newFilters) => {
                  setFilters(newFilters);
                  setActiveCat(newFilters.category);
                }}
                categories={CATEGORIES}
                initialFilters={filters}
              />
            </div>
          </div>
        </div>
        <div className={styles.grid}>
          {paginated.length === 0 ? (
            <div className={styles.emptyState}>
              <h3 className={styles.emptyTitle}>Nenhum produto encontrado</h3>
              <p className={styles.emptySubtitle}>
                Tente ajustar os filtros ou adicione novos produtos.
              </p>
            </div>
          ) : (
            paginated.map((p: ProductResponse) => (
              <EntityCard
                height={350}
                lowStock={p.lowStock}
                key={p.id}
                id={p.id}
                name={p.name}
                description={p.description}
                category={p.category}
                price={p.price}
                promoPrice={p.promoPrice}
                imageUrl={[
                  ...(p.images || []),
                  ...(p.variations || [])
                    .filter((variation) => variation.imageUrl)
                    .map((variation) => ({
                      url: variation.imageUrl || "",
                      fileName: variation.name || "",
                      id: variation.id || "",
                      isPrimary: false,
                    })),
                ]}
                stock={p.stock ?? undefined}
                available
                color={p.color}
                colors={Array.from(
                  new Set([
                    ...(p.color ? [p.color] : []),
                    ...((p.variations || [])
                      .map((variation) => variation.color)
                      .filter(Boolean) as string[]),
                  ]),
                )}
                size={p.size}
                sizes={Array.from(
                  new Set([
                    ...(p.size ? [p.size] : []),
                    ...((p.variations || [])
                      .map((variation) => variation.size)
                      .filter(Boolean) as string[]),
                  ]),
                )}
                variations={p.variations}
                status={p.status}
                onEdit={() => {}}
                onDelete={undefined}
                onToggleAvailable={() => {}}
                navigateTo={`/product-details/${p.id}`}
              />
            ))
          )}
        </div>
        <div className={styles.bottom}>
          <div className={styles.counter}>
            Mostrando {paginated.length} de {total} produtos
          </div>
          <div className={styles.pagination}>
            <button
              className={
                styles.pageBtn +
                (currentPage === 1 ? " " + styles.pageBtnDisabled : "")
              }
              type="button"
              onClick={() => setPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              aria-label="Pagina anterior"
            >
              ‹
            </button>
            {pages.map((p) => (
              <button
                key={p}
                className={
                  styles.pageBtn +
                  (p === currentPage ? " " + styles.pageBtnActive : "")
                }
                type="button"
                onClick={() => setPage(p)}
              >
                {p}
              </button>
            ))}
            <button
              className={
                styles.pageBtn +
                (currentPage === maxPage ? " " + styles.pageBtnDisabled : "")
              }
              type="button"
              onClick={() => setPage(Math.min(maxPage, currentPage + 1))}
              disabled={currentPage === maxPage}
              aria-label="Proxima pagina"
            >
              ›
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
