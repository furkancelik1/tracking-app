import * as React from "react";

// ─── Tipler ──────────────────────────────────────────────────────────────────

export interface PendingRoutine {
  title: string;
  currentStreak: number;
  color: string;
}

export interface EmailTexts {
  badge: string;
  headerTitle: string;
  headerSub: string;
  greeting: string;
  lead: string;
  alertRisk: string;
  cta: string;
  footerText: string;
  unsubscribe: string;
  dayUnit: string;
  copyright: string;
}

export interface HabitReminderProps {
  pendingRoutines: PendingRoutine[];
  dashboardUrl: string;
  settingsUrl: string;
  texts: EmailTexts;
}

// ─── Bileşen ─────────────────────────────────────────────────────────────────

export function HabitReminder({
  pendingRoutines,
  dashboardUrl,
  settingsUrl,
  texts,
}: HabitReminderProps) {
  const count = pendingRoutines.length;
  const atRisk = pendingRoutines.filter((r) => r.currentStreak >= 3);

  return (
    <html>
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>{texts.headerTitle}</title>
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
                        <div style={styles.badge}>{texts.badge}</div>
                        <div style={styles.headerTitle}>{texts.headerTitle}</div>
                        <div style={styles.headerSub}>
                          {texts.headerSub}
                        </div>
                      </td>
                    </tr>

                    {/* ── Body ── */}
                    <tr>
                      <td style={styles.body2}>
                        <p style={styles.greeting}>{texts.greeting}</p>
                        <p
                          style={styles.lead}
                          dangerouslySetInnerHTML={{ __html: texts.lead }}
                        />

                        {/* Risk alert */}
                        {atRisk.length > 0 && (
                          <div style={styles.alertBox}>
                            <span style={styles.alertIcon}>⚠️</span>
                            <span
                              style={styles.alertText}
                              dangerouslySetInnerHTML={{ __html: texts.alertRisk }}
                            />
                          </div>
                        )}

                        {/* Routine list */}
                        <div style={styles.listBox}>
                          {pendingRoutines.map((r, i) => (
                            <div
                              key={i}
                              style={{
                                ...styles.listItem,
                                borderBottom:
                                  i < count - 1
                                    ? "1px solid #1e1e2e"
                                    : "none",
                              }}
                            >
                              <span
                                style={{
                                  ...styles.dot,
                                  backgroundColor: r.color,
                                }}
                              />
                              <span style={styles.listTitle}>{r.title}</span>
                              {r.currentStreak > 0 && (
                                <span style={styles.streak}>
                                  🔥 {r.currentStreak} {texts.dayUnit}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* CTA */}
                        <table
                          cellPadding={0}
                          cellSpacing={0}
                          style={{ margin: "0 auto 8px" }}
                        >
                          <tbody>
                            <tr>
                              <td style={styles.ctaCell}>
                                <a href={dashboardUrl} style={styles.cta}>
                                  {texts.cta} →
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
                          {texts.footerText}{" "}
                          <a href={settingsUrl} style={styles.footerLink}>
                            {texts.unsubscribe}
                          </a>
                        </p>
                        <p style={{ ...styles.footerText, marginTop: 4 }}>
                          {texts.copyright}
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

// ─── Deep Dark Stiller ───────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  body: {
    margin: 0,
    padding: 0,
    backgroundColor: "#09090b",
    fontFamily:
      "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif",
  },
  wrapper: {
    backgroundColor: "#09090b",
    padding: "48px 16px",
  },
  card: {
    backgroundColor: "#111113",
    borderRadius: 16,
    overflow: "hidden",
    border: "1px solid #1e1e2e",
    boxShadow: "0 4px 24px rgba(0,0,0,.4)",
  },
  // Header
  header: {
    background: "linear-gradient(135deg,#4f46e5 0%,#7c3aed 60%,#6d28d9 100%)",
    padding: "40px 48px 36px",
    textAlign: "center" as const,
  },
  badge: {
    display: "inline-block",
    backgroundColor: "rgba(255,255,255,.12)",
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
    color: "rgba(255,255,255,.7)",
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
    color: "#f4f4f5",
  },
  lead: {
    margin: "0 0 24px",
    fontSize: 15,
    color: "#a1a1aa",
    lineHeight: 1.65,
  },
  // Alert
  alertBox: {
    display: "flex" as const,
    alignItems: "flex-start" as const,
    gap: 10,
    backgroundColor: "rgba(245,158,11,.1)",
    border: "1px solid rgba(245,158,11,.25)",
    borderRadius: 10,
    padding: "12px 16px",
    marginBottom: 20,
  },
  alertIcon: { fontSize: 16, lineHeight: 1.4, flexShrink: 0 },
  alertText: { fontSize: 13, color: "#fbbf24", lineHeight: 1.5 },
  // List
  listBox: {
    backgroundColor: "#0a0a0c",
    border: "1px solid #1e1e2e",
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
    color: "#d4d4d8",
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
    borderTop: "1px solid #1e1e2e",
    textAlign: "center" as const,
  },
  footerText: {
    margin: "0 0 2px",
    fontSize: 12,
    color: "#52525b",
    lineHeight: 1.5,
  },
  footerLink: {
    color: "#818cf8",
    textDecoration: "none",
  },
};
