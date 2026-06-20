import { FiMail, FiMapPin, FiPhone, FiUser } from "react-icons/fi";
import styles from "./CreditCustomerCard.module.css";

type Props = {
  name: string;
  badge: string;
  email?: string;
  phone?: string;
  location?: string;
  initials: string;
};

export function CreditCustomerCard({
  name,
  badge,
  email,
  phone,
  location,
  initials,
}: Props) {
  return (
    <article className={styles.card}>
      <div className={styles.hero}>
        <div className={styles.avatarWrap}>
          <div className={styles.avatar}>
            {initials ? (
              <span className={styles.initials}>{initials}</span>
            ) : (
              <FiUser />
            )}
          </div>
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.header}>
          <h3 className={styles.name}>{name}</h3>
          <span className={styles.badge}>{badge}</span>
        </div>

        <div className={styles.metaList}>
          {email && (
            <div className={styles.metaItem}>
              <span className={styles.iconWrap}>
                <FiMail className={styles.icon} />
              </span>
              <span className={styles.metaText}>{email}</span>
            </div>
          )}

          {phone && (
            <div className={styles.metaItem}>
              <span className={styles.iconWrap}>
                <FiPhone className={styles.icon} />
              </span>
              <span className={styles.metaText}>{phone}</span>
            </div>
          )}

          {location && (
            <div className={styles.metaItem}>
              <span className={styles.iconWrap}>
                <FiMapPin className={styles.icon} />
              </span>
              <span className={styles.metaText}>{location}</span>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}