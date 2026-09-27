import React from "react";
import "./MetricCard.css";

/**
 * MetricCard: Displays high-level account figures with trend badges
 * @param {string} title - Label (e.g. "Total Value", "Cash Balance")
 * @param {string|number} value - Primary dollar amount
 * @param {string} [subtext] - Secondary info or percentage
 * @param {React.ReactNode} [icon] - Icon from lucide-react
 * @param {'positive'|'negative'|'neutral'} [trend] - Dictates badge color
 */
export default function MetricCard({
  title,
  value,
  subtext,
  icon,
  trend = "neutral",
}) {
  return (
    <div className="metric-card">
      <div className="metric-card-header">
        <span className="metric-title">{title}</span>
        {icon && <span className="metric-icon">{icon}</span>}
      </div>
      <div className="metric-primary-value tabular-nums">{value}</div>
      {subtext && (
        <div className="metric-footer">
          <span className={`metric-badge badge-${trend}`}>{subtext}</span>
        </div>
      )}
    </div>
  );
}
