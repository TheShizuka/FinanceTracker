// src/pages/AddFriend.jsx
import { useState, useEffect, useRef } from "react";
import { db, auth } from "../firebase";
import { collection, addDoc, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { toast } from "react-toastify";
import { FaAt, FaUserPlus, FaCopy, FaCheck } from "react-icons/fa";

const AddFriend = () => {
  const [friendUID, setFriendUID] = useState("");
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const user = auth.currentUser;
  const handleRef = useRef("");

  useEffect(() => {
    if (!user) return;
    
    const fetchProfile = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const profileData = userDoc.data();
          setCurrentUserProfile(profileData);
          handleRef.current = profileData.handle || "";
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      }
    };
    
    fetchProfile();
  }, [user]);

  const handleAddFriend = async () => {
    if (!user || !friendUID) {
      toast.error("Please enter a friend's UID");
      return;
    }
    
    // Clean up handle - ensure it has @ prefix
    const cleanFriendUID = friendUID.trim();
    const formattedUID = cleanFriendUID.startsWith('@') ? cleanFriendUID : `@${cleanFriendUID}`;
    
    // Prevent adding yourself
    if (currentUserProfile?.handle === formattedUID) {
      toast.error("You can't add yourself as a friend");
      return;
    }
    
    setLoading(true);
    
    try {
      // Check if handle exists
      const userQuery = query(
        collection(db, "users"),
        where("handle", "==", formattedUID)
      );
      
      const userSnapshot = await getDocs(userQuery);
      
      if (userSnapshot.empty) {
        toast.error("User not found. Please check the UID and try again");
        setLoading(false);
        return;
      }
      
      // Check if users are already friends
      const recipientData = userSnapshot.docs[0].data();
      const recipientId = userSnapshot.docs[0].id;
      
      if (currentUserProfile?.friends?.includes(recipientId)) {
        toast.error("This user is already your friend");
        setLoading(false);
        return;
      }
      
      // Check for duplicate pending friend request
      const dupQuery = query(
        collection(db, "friendRequests"),
        where("from", "==", user.uid),
        where("to", "==", formattedUID),
        where("status", "==", "pending")
      );
      
      const dupSnapshot = await getDocs(dupQuery);
      
      if (!dupSnapshot.empty) {
        toast.error("You have already sent a friend request to this user");
        setLoading(false);
        return;
      }
      
      // Create friend request document
      const friendRequestRef = await addDoc(collection(db, "friendRequests"), {
        from: user.uid,
        to: formattedUID,
        status: "pending",
        timestamp: new Date(),
        senderName: currentUserProfile?.username || user.displayName || "Unknown",
        senderPhotoURL: currentUserProfile?.photoURL || null
      });
      
      // Create notification for recipient
      await addDoc(collection(db, "notifications"), {
        to: formattedUID,
        type: "friend-request",
        message: `${currentUserProfile?.username || user.displayName || "Someone"} sent you a friend request`,
        timestamp: new Date(),
        read: false,
        senderName: currentUserProfile?.username || user.displayName || "Unknown",
        senderPhotoURL: currentUserProfile?.photoURL || null,
        requestId: friendRequestRef.id,
        from: user.uid
      });
      
      toast.success("Friend request sent!");
      setFriendUID("");
    } catch (error) {
      console.error("Error sending friend request:", error);
      toast.error("Error sending friend request: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Copy handle to clipboard function
  const copyHandle = () => {
    const handleToCopy = currentUserProfile?.handle || handleRef.current;
    
    if (!handleToCopy) {
      toast.error("No handle available to copy");
      return;
    }
    
    try {
      navigator.clipboard.writeText(handleToCopy);
      setCopied(true);
      toast.success("Handle copied to clipboard!");
      
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (err) {
      console.error("Could not copy handle: ", err);
      
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement("textarea");
      textArea.value = handleToCopy;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      try {
        const successful = document.execCommand('copy');
        if (successful) {
          setCopied(true);
          toast.success("Handle copied to clipboard!");
          
          setTimeout(() => {
            setCopied(false);
          }, 2000);
        } else {
          throw new Error("Copy command failed");
        }
      } catch (e) {
        toast.error("Failed to copy handle");
      }
      
      document.body.removeChild(textArea);
    }
  };

  return (
    <div>
      <div className="relative mb-4">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none icon-container">
        <FaAt className="text-gray-400" />
      </div>
      <input
        type="text"
        placeholder="Enter friend's UID (e.g. @user1234)"
        className="form-input pl-10 form-input-with-icon"
        value={friendUID}
        onChange={(e) => setFriendUID(e.target.value)}
      />
    </div>
      
      <button 
        onClick={handleAddFriend} 
        disabled={loading || !friendUID.trim()}
        className="btn btn-primary w-full flex items-center justify-center"
      >
        {loading ? (
          <span className="flex items-center">
            <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Sending...
          </span>
        ) : (
          <>
            <FaUserPlus className="mr-2" />
            Send Friend Request
          </>
        )}
      </button>
      
      <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
        <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">Share Your UID</h3>
        <div className="relative">
          <p className="text-sm text-blue-600 dark:text-blue-400 pr-10">
            Your UID: <strong>{currentUserProfile?.handle || "Loading..."}</strong>
          </p>
          <button 
            onClick={copyHandle}
            className="absolute right-0 top-0 text-blue-500 hover:text-blue-700 dark:hover:text-blue-300"
            aria-label="Copy UID"
          >
            {copied ? <FaCheck className="text-green-500" /> : <FaCopy />}
          </button>
        </div>
        <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">
          Share your UID with friends so they can add you
        </p>
      </div>
    </div>
  );
};

export default AddFriend;