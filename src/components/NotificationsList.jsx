// src/components/NotificationsList.jsx
import { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc, 
  arrayUnion, 
  getDoc 
} from "firebase/firestore";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "react-toastify";
import { FaTimes, FaUserFriends, FaUsers, FaRegCheckCircle, FaRegTimesCircle, FaBell, FaRegBell } from "react-icons/fa";

const NotificationsList = ({ onClose }) => {
  const [notifications, setNotifications] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const user = auth.currentUser;

  // Fetch current user's profile to get the handle
  useEffect(() => {
    if (!user) return;
    
    const fetchProfile = async () => {
      try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserProfile(docSnap.data());
        }
        setLoading(false);
      } catch (error) {
        console.error("Error fetching user profile:", error);
        setLoading(false);
      }
    };
    
    fetchProfile();
  }, [user]);

  // Query notifications using current user's handle
  useEffect(() => {
    if (!userProfile || !userProfile.handle) return;
    
    const q = query(
      collection(db, "notifications"),
      where("to", "==", userProfile.handle),
      orderBy("timestamp", "desc")
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setNotifications(notifs);
    });
    
    return () => unsubscribe();
  }, [userProfile]);

  const acceptAction = async (notification) => {
    try {
      if (notification.type === "group-invite" && notification.groupId) {
        // Accept group invite
        await updateDoc(doc(db, "groups", notification.groupId), {
          members: arrayUnion(user.uid)
        });
        
        toast.success("Group invite accepted!");
      } else if (notification.type === "friend-request" && notification.requestId) {
        // Accept friend request
        await updateDoc(doc(db, "friendRequests", notification.requestId), { 
          status: "accepted",
          acceptedAt: new Date()
        });
        
        // Update both users' friend lists
        await updateDoc(doc(db, "users", user.uid), {
          friends: arrayUnion(notification.from)
        });
        
        await updateDoc(doc(db, "users", notification.from), {
          friends: arrayUnion(user.uid)
        });
        
        toast.success("Friend request accepted!");
      }
      
      // Mark as read and remove notification
      await deleteDoc(doc(db, "notifications", notification.id));
    } catch (error) {
      console.error("Error accepting notification:", error);
      toast.error("Error processing request: " + error.message);
    }
  };

  const rejectAction = async (notification) => {
    try {
      if (notification.type === "friend-request" && notification.requestId) {
        // Reject friend request
        await updateDoc(doc(db, "friendRequests", notification.requestId), { 
          status: "rejected",
          rejectedAt: new Date()
        });
      }
      
      // Mark as read and remove notification
      await deleteDoc(doc(db, "notifications", notification.id));
      toast.success("Request rejected");
    } catch (error) {
      console.error("Error rejecting notification:", error);
      toast.error("Error processing request: " + error.message);
    }
  };

  const dismissNotification = async (notification) => {
    try {
      await deleteDoc(doc(db, "notifications", notification.id));
    } catch (error) {
      console.error("Error dismissing notification:", error);
      toast.error("Error dismissing notification");
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "friend-request":
        return <FaUserFriends className="text-blue-500" />;
      case "group-invite":
        return <FaUsers className="text-purple-500" />;
      default:
        return <FaBell className="text-gray-500" />;
    }
  };

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return "";
    
    const date = new Date(timestamp.seconds * 1000);
    return formatDistanceToNow(date, { addSuffix: true });
  };

  if (loading) {
    return (
      <div 
        className="fixed top-16 right-4 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg z-50 w-80 p-4 animate-fadeIn"
        onClick={(e) => e.stopPropagation()} // Prevent bubbling to close
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold">Notifications</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            <FaTimes />
          </button>
        </div>
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="fixed top-16 right-4 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg z-50 w-80 animate-fadeIn"
      onClick={(e) => e.stopPropagation()} // Prevent bubbling to close parent elements
    >
      <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-700">
        <h2 className="font-bold">Notifications</h2>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }} 
          className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          <FaTimes />
        </button>
      </div>
      
      <div className="max-h-[400px] overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-8 flex flex-col items-center justify-center text-center text-gray-500 dark:text-gray-400">
            <FaRegBell className="text-gray-300 dark:text-gray-600 h-10 w-10 mb-3" />
            <p>No notifications</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {notifications.map((notification) => (
              <div key={notification.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700">
                <div className="flex items-start mb-2">
                  <div className="mr-3 mt-1">
                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                      {notification.senderPhotoURL ? (
                        <img 
                          src={notification.senderPhotoURL} 
                          alt="Sender" 
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        getNotificationIcon(notification.type)
                      )}
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <p className="font-medium">
                        {notification.type === "friend-request" ? "Friend Request" : "Group Invite"}
                      </p>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          dismissNotification(notification);
                        }}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <FaTimes size={12} />
                      </button>
                    </div>
                    
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                      {notification.message}
                    </p>
                    
                    <p className="text-xs text-gray-500 mt-1">
                      {getTimeAgo(notification.timestamp)}
                    </p>
                  </div>
                </div>
                
                {(notification.type === "friend-request" || notification.type === "group-invite") && (
                  <div className="flex space-x-2 mt-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        acceptAction(notification);
                      }}
                      className="flex-1 py-1.5 bg-primary text-white rounded-md text-sm flex items-center justify-center"
                    >
                      <FaRegCheckCircle className="mr-1" />
                      Accept
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        rejectAction(notification);
                      }}
                      className="flex-1 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md text-sm flex items-center justify-center"
                    >
                      <FaRegTimesCircle className="mr-1" />
                      Decline
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsList;