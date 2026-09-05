import React from "react";

export default function StatsCard({ label, value, icon, trend }) {
  return (
    <div className="sa-stat-card">
      <div className="sa-stat-card__icon">{icon}</div>
      <div className="sa-stat-card__body">
        <span className="sa-stat-card__label">{label}</span>
        <span className="sa-stat-card__value">{value}</span>
        {trend && (
          <span className={`sa-stat-card__trend sa-stat-card__trend--${trend.direction}`}>
            {trend.direction === "up" ? "▲" : "▼"} {trend.value}
          </span>
        )}
      </div>
    </div>
  );
}
