import React from "react";

/**
 * columns: [{ key, label, render?(row) }]
 * rows: array of data objects
 * actions?(row): ReactNode — optional per-row action buttons
 */
export default function DataTable({ columns, rows, actions, emptyText = "No records found" }) {
  return (
    <div className="sa-table-wrapper">
      <table className="sa-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>{col.label}</th>
            ))}
            {actions && <th className="sa-table__actions-col">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="sa-table__empty" colSpan={columns.length + (actions ? 1 : 0)}>
                {emptyText}
              </td>
            </tr>
          ) : (
            rows.map((row, idx) => (
              <tr key={row.id ?? idx}>
                {columns.map((col) => (
                  <td key={col.key}>{col.render ? col.render(row) : row[col.key]}</td>
                ))}
                {actions && <td className="sa-table__actions-col">{actions(row)}</td>}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
