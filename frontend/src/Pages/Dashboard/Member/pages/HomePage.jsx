import React from 'react'

const HomePage = ({ user = {}, sanghasName = "" }) => {
  
  return (
    <>
      <>
            <section className="md-welcome">
        <h1 className="md-welcome__title">
          Welcome back, {(user.fullname || "Member").split(" ")[0]}
        </h1>
        <p className="md-welcome__subtitle">
          Here's a quick look at your sangha membership.
        </p>
      </section>

            <section className="md-cards">
              <div className="md-card">
                <div className="md-card__label">Membership Status</div>
                <div className="md-card__value">Active</div>
              </div>

              <div className="md-card">
                <div className="md-card__label">Sangha</div>
                <div className="md-card__value">{sanghasName || "—"}</div>
              </div>

              <div className="md-card">
                <div className="md-card__label">Role</div>
                <div className="md-card__value">{user.role || "member"}</div>
              </div>
            </section>

            <section className="md-panel">
              <h2 className="md-panel__title">My Details</h2>
              <div className="md-detail-grid">
                <div className="md-detail">
                  <span className="md-detail__label">Full Name</span>
                  <span className="md-detail__value">
                    {user.fullname || "-"}
                  </span>
                </div>

                <div className="md-detail">
                  <span className="md-detail__label">Email</span>
                  <span className="md-detail__value">{user.email || "-"}</span>
                </div>
              </div>
            </section>

            <section className="md-panel">
              <h2 className="md-panel__title">Membership Information</h2>
              <div className="md-detail-grid">
                <div className="md-detail">
                  <span className="md-detail__label">Membership Status</span>
                  <span className="md-detail__value">Active</span>
                </div>

                <div className="md-detail">
                  <span className="md-detail__label">Member Role</span>
                  <span className="md-detail__value">
                    {user.role || "member"}
                  </span>
                </div>

                <div className="md-detail">
                  <span className="md-detail__label">Sangha</span>
                  <span className="md-detail__value">{sanghasName || "—"}</span>
                </div>

                <div className="md-detail">
                  <span className="md-detail__label">Member Since</span>
                  <span className="md-detail__value">—</span>
                </div>
              </div>
            </section>
          </>
    </>
  )
}

export default HomePage
