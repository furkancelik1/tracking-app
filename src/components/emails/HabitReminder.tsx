import * as React from "react";

// ─── Tipler ──────────────────────────────────────────────────────────────────

export interface PendingRoutine {
  title: string;
  currentStreak: number;
  color: string;
}

export interface HabitReminderProps {
  userName: string;
  pendingRoutines: PendingRoutine[];
  dashboardUrl: string;
  settingsUrl: string;
}

// ─── Bileşen ─────────────────────────────────────────────────────────────────
// Resend'in react: prop'una geçirilen standart JSX bileşeni.
// @react-email/components paketi gerekmez — Resend dahili render eder.

export function HabitReminder({
  userName,
  pendingRoutines,
  dashboardUrl,
  settingsUrl,
}: HabitReminderProps) {
  const firstName = userName.split(" ")[0] || userName;
  const count = pendingRoutines.length;
  const atRisk = pendingRoutines.filter((r) => r.currentStreak >= 3);

  return (
    <html lang="tr">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>Rutin Hatırlatıcı</title>
      </head>
      <body style={styles.body}>
        {/* Wrapper */}
        <table width="100%" cellPadding={0} cellSpacing={0} style={styles.wrapper}>
          <tbody>
            <tr>
              <td align="center">
                {/* Kart */}
                <table
                  width="580"
                  cellPadding={0}
                  cellSpacing={0}
                  style={styles.card}
                >
                  <tbody>
                    {/* ── Header ── */}
                    <tr>
                      <td style={styles.header}>
                        <div style={styles.badge}>🔥 Hatırlatıcı</div>
                        <div style={styles.headerTitle}>Serini bozma!</div>
                        <div style={styles.headerSub}>
                          Bugün {count} rutin seni bekliyor
                        </div>
                      </td>
                    </tr>

                    {/* ── Gövde ── */}
                    <tr>
                      <td style={styles.body2}>
                        {/* Selamlama */}
                        <p style={styles.greeting}>Hey {firstName}, 👋</p>
                        <p style={styles.lead}>
                          Bugün tamamlaman gereken{" "}
                          <strong style={{ color: "#6366f1" }}>
                            {count} {count === 1 ? "rutin" : "rutin"}
                          </strong>{" "}
                          var. Her birini tamamladığında serilerin güçlenmeye devam
                          ediyor.
                        </p>

                        {/* Kritik uyarı — 3+ günlük seri tehlikede */}
                        {atRisk.length > 0 && (
                          <div style={styles.alertBox}>
                            <span style={styles.alertIcon}>⚠️</span>
                            <span style={styles.alertText}>
                              <strong>{atRisk.length} rutinin</strong> serisi
                              tehlikede! Bugün tamamlamazsan sıfırlanacak.
                            </span>
                          </div>
                        )}

                        {/* Rutin listesi */}
                        <div style={styles.listBox}>
                          {pendingRoutines.map((r, i) => (
                            <div
                              key={i}
                              style={{
                                ...styles.listItem,
                                borderBottom:
                                  i < pendingRoutines.length - 1
                                    ? "1px solid #f3f4f6"
                                    : "none",
                              }}
                            >
                              {/* Renk noktası */}
                              <span
                                style={{
                                  ...styles.dot,
                                  backgroundColor: r.color,
                                }}
                              />
                              {/* Başlık */}
                              <span style={styles.listTitle}>{r.title}</span>
                              {/* Seri */}
                              {r.currentStreak > 0 && (
                                <span style={styles.streak}>
                                  🔥 {r.currentStreak} gün
                                </span>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* CTA Butonu */}
                        <table
                          cellPadding={0}
                          cellSpacing={0}
                          style={{ margin: "0 auto 8px" }}
                        >
                          <tbody>
                            <tr>
                              <td style={styles.ctaCell}>
                                <a href={dashboardUrl} style={styles.cta}>
                                  Rutinlere Git →
                                </a>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>

                    {/* ── Footer ── */}
                    <tr>
                      <td style={styles.footer}>
                        <p style={styles.footerText}>
                          Bu hatırlatıcıyı almak istemiyorsan{" "}
                          <a href={settingsUrl} style={styles.footerLink}>
                            ayarlardan
                          </a>{" "}
                          kapatabilirsin.
                        </p>
                        <p style={{ ...styles.footerText, marginTop: 4 }}>
                          © {new Date().getFullYear()} Rutin Takip
                        </p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  );
}

// ─── Stiller ─────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  body: {
    margin: 0,
    padding: 0,
    backgroundColor: "#f3f4f6",
    fontFamily:
      "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif",
  },
  wrapper: {
    backgroundColor: "#f3f4f6",
    padding: "48px 16px",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    overflow: "hidden",
    boxShadow: "0 4px 16px rgba(0,0,0,.07)",
  },
  // Header
  header: {
    background: "linear-gradient(135deg,#6366f1 0%,#8b5cf6 60%,#a78bfa 100%)",
    padding: "40px 48px 36px",
    textAlign: "center" as const,
  },
  badge: {
    display: "inline-block",
    backgroundColor: "rgba(255,255,255,.18)",
    color: "#ffffff",
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: "0.8px",
    textTransform: "uppercase" as const,
    padding: "4px 12px",
    borderRadius: 20,
    marginBottom: 16,
  },
  headerTitle: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: 700,
    letterSpacing: "-0.5px",
    margin: "0 0 8px",
  },
  headerSub: {
    color: "rgba(255,255,255,.8)",
    fontSize: 15,
    margin: 0,
  },
  // Body
  body2: {
    padding: "36px 48px 32px",
  },
  greeting: {
    margin: "0 0 8px",
    fontSize: 20,
    fontWeight: 600,
    color: "#111827",
  },
  lead: {
    margin: "0 0 24px",
    fontSize: 15,
    color: "#6b7280",
    lineHeight: 1.65,
  },
  // Alert
  alertBox: {
    display: "flex" as const,
    alignItems: "flex-start" as const,
    gap: 10,
    backgroundColor: "#fef3c7",
    border: "1px solid #fde68a",
    borderRadius: 10,
    padding: "12px 16px",
    marginBottom: 20,
  },
  alertIcon: { fontSize: 16, lineHeight: 1.4, flexShrink: 0 },
  alertText: { fontSize: 13, color: "#92400e", lineHeight: 1.5 },
  // List
  listBox: {
    backgroundColor: "#f9fafb",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 28,
  },
  listItem: {
    display: "flex" as const,
    alignItems: "center" as const,
    gap: 10,
    padding: "12px 16px",
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    flexShrink: 0,
  },
  listTitle: {
    flex: 1,
    fontSize: 14,
    color: "#374151",
    fontWeight: 500,
  },
  streak: {
    fontSize: 12,
    color: "#f97316",
    fontWeight: 600,
    whiteSpace: "nowrap" as const,
  },
  // CTA
  ctaCell: {
    backgroundColor: "#6366f1",
    borderRadius: 10,
  },
  cta: {
    display: "inline-block",
    padding: "14px 36px",
    color: "#ffffff",
    fontSize: 15,
    fontWeight: 600,
    textDecoration: "none",
    letterSpacing: "0.1px",
  },
  // Footer
  footer: {
    padding: "20px 48px",
    borderTop: "1px solid #e5e7eb",
    textAlign: "center" as const,
  },
  footerText: {
    margin: "0 0 2px",
    fontSize: 12,
    color: "#9ca3af",
    lineHeight: 1.5,
  },
  footerLink: {
    color: "#6366f1",
    textDecoration: "none",
  },
};
