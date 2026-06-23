import styles from "./DashboardPreview.module.css";

interface DashboardPreviewProps {
  color: string;
  imageUrl?: string;
  name?: string;
}

export default function DashboardPreview({
  color,
  imageUrl,
  name,
}: DashboardPreviewProps) {
  function hexToRgba(hex: string, alpha: number) {
    let c = hex.replace("#", "");
    if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
    const num = parseInt(c, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r},${g},${b},${alpha})`;
  }
  const bg = hexToRgba(color, 0.15);
  return (
    <div className={styles.previewWrap} style={{ borderColor: color }}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          {imageUrl ? (
            <img src={imageUrl} alt="Logo" className={styles.logoImage} />
          ) : (
            <div className={styles.logoIcon} style={{ color }} />
          )}
          <span className={styles.logoText}>{name}</span>
        </div>
        <nav className={styles.menu}>
          <div
            className={styles.menuItemActive}
            style={{ background: bg, color: color }}
          >
            <span className={styles.menuIcon}>🏠</span>
            <span className={styles.menuText}>Dashboard</span>
          </div>
          <div className={styles.menuItem}>
            <span className={styles.menuIcon}>📦</span>
            <span className={styles.menuText}>Produtos</span>
          </div>
          <div className={styles.menuItem}>
            <span className={styles.menuIcon}>⬇️</span>
            <span className={styles.menuText}>Baixa de estoque</span>
          </div>
          <div className={styles.menuItem}>
            <span className={styles.menuIcon}>❗</span>
            <span className={styles.menuText}>Sem estoque</span>
          </div>
        </nav>
      </aside>
      <main className={styles.main}>
        <div className={styles.cardsRow}>
          <div className={styles.card}>
            <div className={styles.cardIcon} style={{ color }}>
              🛒
            </div>
            <div className={styles.cardLabel}>Vendas totais</div>
            <div className={styles.cardValue}>1</div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardIcon} style={{ color }}>
              💰
            </div>
            <div className={styles.cardLabel}>Faturamento</div>
            <div className={styles.cardValue}>R$ 122,22</div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardIcon} style={{ color }}>
              📦
            </div>
            <div className={styles.cardLabel}>Itens em estoque</div>
            <div className={styles.cardValue}>1</div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardIcon} style={{ color }}>
              ⚠️
            </div>
            <div className={styles.cardLabel}>Estoque baixo</div>
            <div className={styles.cardValue}>0</div>
          </div>
        </div>
        <div className={styles.salesPerformance}>
          <div className={styles.salesTitle}>Performance de Vendas</div>
          <div className={styles.salesChart}>
            <div
              className={styles.salesBar}
              style={{ background: color, height: 30 }}
            />
            <div
              className={styles.salesBar}
              style={{ background: color, height: 10 }}
            />
            <div
              className={styles.salesBar}
              style={{ background: color, height: 20 }}
            />
          </div>
        </div>

        {/* Movimentações Recentes - Preview */}
        <div className={styles.miniMovWrap}>
          <div className={styles.miniMovTitle}>Movimentações Recentes</div>
          <div className={styles.miniMovTableWrap}>
            <table className={styles.miniMovTable}>
              <thead>
                <tr className={styles.miniMovTheadRow}>
                  <th>PRODUTO</th>
                  <th>DATA/HORA</th>
                  <th>RESPONSÁVEL</th>
                  <th>VARIAÇÃO</th>
                  <th>QTD</th>
                  <th>VALOR</th>
                  <th>FORMA DE PAGAMENTO</th>
                  <th>MOTIVO</th>
                  <th>TIPO</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className={styles.miniMovBold}>Bermuda</td>
                  <td>
                    20 de mar.
                    <br />
                  </td>
                  <td>
                    <span className={styles.miniMovAvatar}>R</span>Resp
                  </td>
                  <td>-</td>
                  <td>1x</td>
                  <td className={styles.miniMovBold}>R$122,22</td>
                  <td>PIX</td>
                  <td>Avaria</td>
                  <td>
                    <span className={styles.miniMovStatus}>SAÍDA</span>
                  </td>
                </tr>
                <tr>
                  <td className={styles.miniMovBold}>Bermuda</td>
                  <td>
                    20 de mar.
                    <br />
                    <span className={styles.miniMovDate}>14:22</span>
                  </td>
                  <td>
                    <span className={styles.miniMovAvatar}>B</span>Bruna
                  </td>
                  <td>-</td>
                  <td>1x</td>
                  <td className={styles.miniMovBold}>R$122,22</td>
                  <td>PIX</td>
                  <td>Venda</td>
                  <td>
                    <span className={styles.miniMovStatus}>SAÍDA</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className={styles.miniMovFooter}>
            Mostrando 4 de 4 movimentações
          </div>
        </div>
      </main>
    </div>
  );
}
