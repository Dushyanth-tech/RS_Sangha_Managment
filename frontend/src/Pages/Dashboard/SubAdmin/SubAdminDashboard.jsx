import React from 'react'

const SubAdminDashboard = () => {
  const handleLogout = () => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");
        window.location.href = "/auth"; // Redirect to login page
    }
  return (
    <div>
      <h1>Sub Admin Dashboard</h1>
      <button onClick={handleLogout}>logout</button>
    </div>
  )
}

export default SubAdminDashboard
