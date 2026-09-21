import React from "react";
import { Building2 } from "lucide-react";

export default function MySangha() {
  return (
    <section className="md-page">
      <div className="md-page__header">
        <h1 className="md-page__title">My Sangha</h1>
        <p className="md-page__subtitle">
          View your Sangha information and membership details.
        </p>
      </div>

      <section className="md-panel">
        <div className="md-empty">
          <div className="md-empty__icon">
            <Building2 size={28} strokeWidth={1.8} />
          </div>
          <h3>No Sangha assigned</h3>
          <p>Your Sangha information will appear here once you are assigned to a Sangha.</p>
        </div>
      </section>
    </section>
  );
}