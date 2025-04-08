// src/pages/VerifyEmail.jsx
import { useState, useEffect } from "react";
import { auth } from "../firebase";
import { sendEmailVerification, reload } from "firebase/auth";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { FaEnvelope, FaCheckCircle, FaSync } from "react-icons/fa";

const VerifyEmail = () => {
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const user = auth.currentUser;

  // Check verification status on initial load
  useEffect(() => {
    if (user) {
      setIsVerified(user.emailVerified);
    }
  }, [user]);

  const handleResendEmail = async () => {
    if (!user) return;
    
    setSending(true);
    try {
      await sendEmailVerification(user);
      toast.success("Verification email sent! Please check your inbox.");
    } catch (error) {
      console.error("Error sending verification email:", error);
      toast.error(`Error sending email: ${error.message}`);
    } finally {
      setSending(false);
    }
  };
  
  const refreshStatus = async () => {
    if (!user) return;
    
    setVerifying(true);
    try {
      await reload(user);
      setIsVerified(user.emailVerified);
      
      if (user.emailVerified) {
        toast.success("Email verified successfully!");
      } else {
        toast.info("Your email is not verified yet. Please check your inbox.");
      }
    } catch (error) {
      console.error("Error refreshing user status:", error);
      toast.error("Error refreshing verification status");
    } finally {
      setVerifying(false);
    }
  };
  
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-12">
        <div className="text-center py-12 w-full max-w-md">
          <h1 className="text-2xl font-bold mb-4">No user signed in</h1>
          <p className="mb-4 text-gray-600 dark:text-gray-400">Please sign in to continue</p>
          <Link to="/login" className="btn btn-primary">Sign In</Link>
        </div>
      </div>
    );
  }
  
  if (isVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-12">
        <div className="text-center py-12 w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-card p-8">
          <div className="mb-6 flex justify-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
              <FaCheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </div>
          <h1 className="text-2xl font-bold mb-4">Email Verified!</h1>
          <p className="mb-8 text-gray-600 dark:text-gray-400">Your email has been successfully verified.</p>
          <Link to="/" className="btn btn-primary w-full">Go to Dashboard</Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-12">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-card p-8">
        <div className="mb-6 flex justify-center">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
            <FaEnvelope className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Verify Your Email</h1>
          <p className="mb-6 text-gray-600 dark:text-gray-400">
            We've sent a verification email to <strong>{user.email}</strong>.
            Please check your inbox and click the verification link.
          </p>
          
          <div className="space-y-4">
            <button
              onClick={handleResendEmail}
              disabled={sending}
              className="btn btn-primary w-full flex items-center justify-center"
            >
              {sending ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sending...
                </span>
              ) : (
                <>
                  <FaEnvelope className="mr-2" />
                  Resend Verification Email
                </>
              )}
            </button>
            
            <button
              onClick={refreshStatus}
              disabled={verifying}
              className="btn btn-outline w-full flex items-center justify-center"
            >
              {verifying ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Checking...
                </span>
              ) : (
                <>
                  <FaSync className="mr-2" />
                  I've Verified My Email
                </>
              )}
            </button>
          </div>
          
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Link to="/login" className="text-primary font-medium hover:text-primary-dark">
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;