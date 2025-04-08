// src/components/VerifiedRoute.jsx
import { Navigate } from "react-router-dom";
import { auth } from "../firebase";

const VerifiedRoute = ({ children }) => {
  const user = auth.currentUser;
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  if (!user.emailVerified) {
    return <Navigate to="/verify-email" />;
  }
  
  return children;
};

export default VerifiedRoute;