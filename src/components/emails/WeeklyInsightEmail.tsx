import * as React from "react";

// ─── Tipler ──────────────────────────────────────────────────────────────────

export interface InsightEmailTexts {
  badge: string;
  headerTitle: string;
  greeting: string;
  intro: string;
  cta: string;
  footerText: string;
  unsubscribe: string;
  copyright: string;
}

export interface WeeklyInsightEmailProps {
  insight: string;
  dashboardUrl: string;
  settingsUrl: string;
  texts: InsightEmailTexts;
}

// ─── Bileşen ─────────────────────────────────────────────────────────────────

export function WeeklyInsightEmail({
  insight,
  dashboardUrl,
  settingsUrl,
  texts,
}: WeeklyInsightEmailProps) {
  const paragraphs = insight.split("\n").filter(Boolean);

  return (
    <html>
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>{texts.headerTitle}</title>
      </head>
      <body style={styles.body}>
        <table width="100%" cellPadding={0} cellSpacing={0} style={styles.wrapper}>
          <tbody>
            <tr>
              <td align="center">
                <table width="580" cellPadding={0} cellSpacing={0} style={styles.card}>
                  <tbody>
                    {/* ── Header ── */}
                    <tr>
                      <td style={styles.header}>
                        <div style={styles.badge}>{texts.badge}</div>
                        <div style={styles.headerTitle}>{texts.headerTitle}</div>
                      </td>
                    </tr>

                    {/* ── Body ── */}
                    <tr>
                      <td style={styles.body2}>
                        <p style={styles.greeting}>{texts.greeting}</p>
                        <p style={styles.lead}>{texts.intro}</p>

                        {/* AI Insight */}
                        <div style={styles.insightBox}>
                          <div style={styles.insightIcon}>🧠</div>
                          {paragraphs.map((p, i) => (
                            <p key={i} style={styles.insightText}>{p}</p>
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
  header: {
    background: "linear-gradient(135deg,#7c3aed 0%,#8b5cf6 50%,#6d28d9 100%)",
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
    fontSize: 26,
    fontWeight: 700,
    letterSpacing: "-0.5px",
    margin: 0,
  },
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
  insightBox: {
    backgroundColor: "#0a0a0c",
    border: "1px solid rgba(139,92,246,.25)",
    borderRadius: 12,
    padding: "20px 24px",
    marginBottom: 28,
  },
  insightIcon: {
    fontSize: 20,
    marginBottom: 12,
  },
  insightText: {
    margin: "0 0 12px",
    fontSize: 14,
    color: "#d4d4d8",
    lineHeight: 1.7,
  },
  ctaCell: {
    backgroundColor: "#7c3aed",
    borderRadius: 8,
    textAlign: "center" as const,
  },
  cta: {
    display: "inline-block",
    padding: "14px 36px",
    color: "#ffffff",
    fontSize: 15,
    fontWeight: 600,
    textDecoration: "none",
    letterSpacing: "0.3px",
  },
  footer: {
    padding: "24px 48px",
    borderTop: "1px solid #1e1e2e",
    textAlign: "center" as const,
  },
  footerText: {
    margin: 0,
    fontSize: 12,
    color: "#52525b",
    lineHeight: 1.5,
  },
  footerLink: {
    color: "#8b5cf6",
    textDecoration: "underline",
  },
};
