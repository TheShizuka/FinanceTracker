// src/components/GroupDetail.jsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db, auth } from "../firebase";
import { 
  doc, getDoc, collection, query, where, orderBy, 
  onSnapshot, updateDoc, addDoc, serverTimestamp, arrayUnion, arrayRemove, getDocs
} from "firebase/firestore";
import { format } from "date-fns";
import { toast } from "react-toastify";
import {
  FaPlus, FaCog, FaUserPlus, FaArrowLeft, FaExchangeAlt,
  FaReceipt, FaCheck, FaTimes, FaArrowRight, FaMoneyBillWave,
  FaHandshake, FaUsers, FaEdit, FaUtensils, FaShoppingBag, FaCar,
  FaHome as FaHomeIcon, FaGamepad, FaBolt, FaMoneyBill
} from "react-icons/fa";
import { getCurrencySymbol } from "../utils/currencyUtils";

// Category icon mapping
const getCategoryIcon = (category) => {
  const icons = {
    food: <FaUtensils className="text-amber-500" />,
    shopping: <FaShoppingBag className="text-blue-500" />,
    transport: <FaCar className="text-green-500" />,
    housing: <FaHomeIcon className="text-purple-500" />,
    entertainment: <FaGamepad className="text-pink-500" />,
    utilities: <FaBolt className="text-yellow-500" />,
    other: <FaMoneyBill className="text-gray-500" />,
    general: <FaMoneyBill className="text-gray-500" />
  };
  
  return icons[category?.toLowerCase()] || <FaMoneyBill className="text-gray-500" />;
};

// Check if a transaction is involved in any settled debt
const isTransactionSettled = (transaction, settledDebts) => {
  if (!transaction || !settledDebts || settledDebts.length === 0) return false;
  
  // Check if this is a settlement transaction itself
  if (transaction.category === "settlement" || transaction.isSettlement) return true;
  
  // If it's not a split expense, it's not part of a settlement
  if (!transaction.splitWith || transaction.splitWith.length === 0) return false;
  
  // Get the date when this transaction was created
  const txDate = transaction.createdAt ? new Date(transaction.createdAt.seconds * 1000) : new Date();
  
  // Check if any settlements were made after this transaction was added
  const settlementAfterTx = settledDebts.some(settlement => {
    if (!settlement.settledAt) return false;
    const settlementDate = new Date(settlement.settledAt);
    return settlementDate > txDate;
  });
  
  return settlementAfterTx;
};

const GroupDetail = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const user = auth.currentUser;
  
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState(null);
  const [balances, setBalances] = useState({});
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [friendsList, setFriendsList] = useState([]);
  const [friendProfiles, setFriendProfiles] = useState([]);
  const [accessDenied, setAccessDenied] = useState(false);
  const [settlements, setSettlements] = useState([]);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [settledDebts, setSettledDebts] = useState([]);
  
  // Fetch group data and check access
  useEffect(() => {
    if (!groupId || !user) return;
    
    const groupRef = doc(db, "groups", groupId);
    const unsubscribe = onSnapshot(groupRef, async (docSnap) => {
      if (docSnap.exists()) {
        const groupData = { id: docSnap.id, ...docSnap.data() };
        
        // Security check - verify if user is a member of this group
        if (!groupData.members.includes(user.uid)) {
          setAccessDenied(true);
          setIsLoading(false);
          return;
        }
        
        setGroup(groupData);
        
        // Fetch member details
        const memberPromises = groupData.members.map(async (memberId) => {
          try {
            const userDocRef = doc(db, "users", memberId);
            const memberDoc = await getDoc(userDocRef);
            if (memberDoc.exists()) {
              return { id: memberDoc.id, ...memberDoc.data() };
            }
            return { id: memberId, displayName: "Unknown User", username: "Unknown User" };
          } catch (error) {
            console.error("Error fetching member:", error);
            return { id: memberId, displayName: "Unknown User", username: "Unknown User" };
          }
        });
        
        const memberData = await Promise.all(memberPromises);
        setMembers(memberData);

        // Get settled debts
        setSettledDebts(groupData.settledDebts || []);
      } else {
        toast.error("Group not found");
        navigate("/groups");
      }
    });
    
    return () => unsubscribe();
  }, [groupId, navigate, user]);
  
  // Fetch current user's friend list
  useEffect(() => {
    if (!user) return;
    
    const userDocRef = doc(db, "users", user.uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const userData = docSnap.data();
        setFriendsList(userData.friends || []);
      }
    });
    
    return () => unsubscribe();
  }, [user]);

  // Fetch friend profiles
  useEffect(() => {
    const fetchFriendProfiles = async () => {
      if (friendsList.length === 0) {
        setFriendProfiles([]);
        return;
      }
      
      const friendsNotInGroup = friendsList.filter(
        friendId => !group || !group.members.includes(friendId)
      );
      
      if (friendsNotInGroup.length === 0) {
        setFriendProfiles([]);
        return;
      }
      
      try {
        const promises = friendsNotInGroup.map(async (uid) => {
          const docSnap = await getDoc(doc(db, "users", uid));
          if (docSnap.exists()) {
            const data = docSnap.data();
            return { 
              uid, 
              username: data.username || uid,
              photoURL: data.photoURL || null,
              handle: data.handle || null
            };
          }
          return { uid, username: uid };
        });
        
        const profiles = await Promise.all(promises);
        setFriendProfiles(profiles);
      } catch (error) {
        console.error("Error fetching friend profiles:", error);
      }
    };
    
    fetchFriendProfiles();
  }, [friendsList, group]);
  
  // Fetch group transactions
  useEffect(() => {
    if (!groupId) return;
    
    const q = query(
      collection(db, "groupTransactions"),
      where("groupId", "==", groupId),
      orderBy("createdAt", "desc")
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const transactionList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      setTransactions(transactionList);
      setIsLoading(false);
      
      // Calculate balances for split expense groups
      if (group && group.type === "split") {
        calculateBalances(transactionList);
      }
    });
    
    return () => unsubscribe();
  }, [groupId, group]);
  
  // Calculate balances whenever relevant data changes
  useEffect(() => {
    if (group && group.type === "split" && members.length > 0 && transactions.length > 0) {
      calculateBalances(transactions);
    }
  }, [group, members, transactions, settledDebts]);
  
  // Calculate balances for expense splitting
  const calculateBalances = (transactions) => {
    if (!members.length) return;
    
    // Initialize balances for each member
    const memberBalances = {};
    members.forEach(member => {
      memberBalances[member.id] = {
        spent: 0,
        owes: {},
        total: 0
      };
    });
    
    // Filter out settlement transactions to avoid double counting
    const nonSettlementTransactions = transactions.filter(tx => tx.category !== "settlement");
    
    // Calculate what each person spent from transactions
    nonSettlementTransactions.forEach(transaction => {
      if (!memberBalances[transaction.userId]) return;
      
      // Add the transaction amount to the user's spent total
      memberBalances[transaction.userId].spent += Number(transaction.amount);
      
      // If the transaction was marked as "for everyone"
      if (transaction.splitWith && transaction.splitWith.length > 0) {
        const amountPerPerson = Math.abs(Number(transaction.amount)) / (transaction.splitWith.length + 1);
        
        transaction.splitWith.forEach(memberId => {
          if (memberId !== transaction.userId) {
            // Initialize if not exists
            if (!memberBalances[transaction.userId].owes[memberId]) {
              memberBalances[transaction.userId].owes[memberId] = 0;
            }
            if (!memberBalances[memberId].owes[transaction.userId]) {
              memberBalances[memberId].owes[transaction.userId] = 0;
            }
            
            // Update who owes what - negative transactions (expenses)
            if (transaction.amount < 0) {
              memberBalances[memberId].owes[transaction.userId] += amountPerPerson;
            }
            // For positive transactions (income that's split)
            else if (transaction.amount > 0) {
              memberBalances[transaction.userId].owes[memberId] += amountPerPerson;
            }
          }
        });
      }
    });

    // Adjust balances for settled debts
    settledDebts.forEach(settlement => {
      if (memberBalances[settlement.from]?.owes[settlement.to]) {
        memberBalances[settlement.from].owes[settlement.to] -= settlement.amount;
      }
      if (memberBalances[settlement.to]?.owes[settlement.from]) {
        memberBalances[settlement.to].owes[settlement.from] += settlement.amount;
      }
    });
    
    // Calculate net balance for each member
    members.forEach(member => {
      let totalOwed = 0;
      let totalOwes = 0;
      
      // Sum up what this member owes others
      Object.keys(memberBalances[member.id].owes).forEach(otherMemberId => {
        totalOwes += Math.max(0, memberBalances[member.id].owes[otherMemberId]);
      });
      
      // Sum up what others owe this member
      members.forEach(otherMember => {
        if (otherMember.id !== member.id && 
            memberBalances[otherMember.id].owes[member.id] > 0) {
          totalOwed += memberBalances[otherMember.id].owes[member.id];
        }
      });
      
      memberBalances[member.id].total = totalOwed - totalOwes;
    });
    
    setBalances(memberBalances);
    
    // Calculate optimal settlements
    calculateSettlements(memberBalances);
  };
  
  // Calculate optimal settlement plan (who pays whom)
  const calculateSettlements = (balances) => {
    // Create a list of members with their balances
    const memberBalances = members.map(member => ({
      id: member.id,
      name: member.displayName || member.username || "Unknown",
      balance: balances[member.id]?.total || 0
    }));
    
    // Sort them - negative balances (debtors) first, then positive (creditors)
    memberBalances.sort((a, b) => a.balance - b.balance);
    
    const settlements = [];
    let i = 0;  // index for debtors (negative balance)
    let j = memberBalances.length - 1;  // index for creditors (positive balance)
    
    // Continue until all debts are settled
    while (i < j) {
      const debtor = memberBalances[i];
      const creditor = memberBalances[j];
      
      // Skip members with zero balance
      if (Math.abs(debtor.balance) < 0.01) {
        i++;
        continue;
      }
      if (Math.abs(creditor.balance) < 0.01) {
        j--;
        continue;
      }
      
      // Calculate the amount to transfer
      const amount = Math.min(Math.abs(debtor.balance), creditor.balance);
      
      if (amount > 0) {
        // IMPORTANT: Always add settlement if amount > 0, don't filter by fullPayment
        // This allows new settlements between the same users after new expenses
        settlements.push({
          from: debtor.id,
          fromName: debtor.name,
          to: creditor.id,
          toName: creditor.name,
          amount: Math.round(amount * 100) / 100, // Round to 2 decimal places
          settled: false // Will be updated later if needed
        });
        
        // Update the balances
        debtor.balance += amount;
        creditor.balance -= amount;
      }
      
      // Move to the next debtor/creditor if their balance is settled
      if (Math.abs(debtor.balance) < 0.01) {
        i++;
      }
      if (Math.abs(creditor.balance) < 0.01) {
        j--;
      }
    }
    
    // Mark settlements as settled if they match existing settled debts
    // We need to compare amounts to handle partial vs. full settlements
    settlements.forEach(settlement => {
      // Find matching settled debts between these users
      const matchingDebts = settledDebts.filter(debt => 
        debt.from === settlement.from && 
        debt.to === settlement.to
      );
      
      // Sum up amounts of existing settlements
      const totalSettled = matchingDebts.reduce((sum, debt) => sum + debt.amount, 0);
      
      // If the current required amount matches what's already been settled,
      // mark it as settled
      settlement.settled = Math.abs(totalSettled - settlement.amount) < 0.01;
    });
    
    setSettlements(settlements);
  };
  
  const handleAddTransaction = () => {
    navigate(`/group/${groupId}/add-transaction`);
  };
  
  const handleSettings = () => {
    // Only allow the group creator to access settings
    if (group.createdBy === user.uid) {
      navigate(`/group/${groupId}/settings`);
    } else {
      toast.error("Only the group creator can access settings");
    }
  };
  
  const handleInviteMember = async (friendId) => {
    if (!friendId) {
      toast.error("Please select a friend to invite");
      return;
    }
    
    try {
      // For budget groups, only the creator can invite members
      if (group.type === "budget" && group.createdBy !== user.uid) {
        toast.error("Only the group creator can invite members to a budget group");
        return;
      }
      
      // Check if already a member
      if (group.members.includes(friendId)) {
        toast.info("User is already a member of this group");
        return;
      }
      
      // Check if already invited
      if (group.invites && group.invites.includes(friendId)) {
        toast.info("User has already been invited");
        return;
      }
      
      // Get friend profile for notification
      const friendDoc = await getDoc(doc(db, "users", friendId));
      if (!friendDoc.exists()) {
        toast.error("Friend's profile not found");
        return;
      }
      
      const friendData = friendDoc.data();
      
      // Update group invites
      await updateDoc(doc(db, "groups", groupId), {
        invites: arrayUnion(friendId)
      });
      
      // Create notification
      await addDoc(collection(db, "notifications"), {
        type: "group-invite",
        from: user.uid,
        to: friendData.handle || friendId,
        message: `${user.displayName || "A user"} invited you to join the group "${group.name}"`,
        timestamp: serverTimestamp(),
        groupId,
        groupName: group.name,
        senderName: user.displayName || "Unknown User",
        senderPhotoURL: user.photoURL || null
      });
      
      toast.success("Invitation sent!");
      setShowAddMemberModal(false);
    } catch (error) {
      console.error("Error inviting member:", error);
      toast.error("Failed to invite member: " + error.message);
    }
  };

  // Enhanced transaction click handler with settlement check
  const handleTransactionClick = (transaction) => {
    // Check if transaction is part of a settlement
    const isSettled = isTransactionSettled(transaction, settledDebts);
    
    // Set additional property to indicate if it's part of a settlement
    setSelectedTransaction({
      ...transaction,
      isPartOfSettlement: isSettled
    });
    
    setShowTransactionModal(true);
  };

  const handleSettleDebt = async (settlement) => {
    // Don't allow settling debts that don't involve the current user
    if (settlement.from !== user.uid && settlement.to !== user.uid) {
      toast.error("You can only settle debts that involve you");
      return;
    }
    
    try {
      // Generate a unique ID for this settlement
      const settledAt = new Date().toISOString();
      const settlementId = `${settlement.from}_${settlement.to}_${settledAt}`;
      
      // Create settlement record with the specific amount (not marking as fullPayment)
      const newSettledDebt = {
        from: settlement.from,
        to: settlement.to,
        amount: settlement.amount,
        settledAt,
        settledBy: user.uid,
        // Remove the fullPayment flag - we're tracking specific amounts now
      };
      
      // Update the group record with the settlement
      const groupRef = doc(db, "groups", groupId);
      await updateDoc(groupRef, {
        settledDebts: arrayUnion(newSettledDebt),
        lastUpdated: serverTimestamp() // Force UI updates
      });
      
      // Create a transaction record for the payment
      await addDoc(collection(db, "groupTransactions"), {
        groupId,
        userId: settlement.from,
        amount: settlement.amount,
        category: "settlement",
        description: `Debt payment to ${settlement.toName}`,
        date: new Date().toISOString(),
        createdAt: serverTimestamp(),
        splitWith: [settlement.to],
        isSettlement: true,
        settlementId: settlementId
      });
      
      toast.success(`Debt of ${getCurrencySymbol(group.currency)}${settlement.amount.toFixed(2)} settled successfully!`);
      
      // Recalculate balances immediately to refresh the UI
      calculateBalances(transactions);
      
    } catch (error) {
      console.error("Error settling debt:", error);
      toast.error("Failed to settle debt: " + error.message);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (accessDenied) {
    return (
      <div className="text-center py-8">
        <h2 className="heading-lg text-red-500 mb-2">Access Denied</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">You do not have permission to view this group.</p>
        <button 
          onClick={() => navigate("/groups")} 
          className="btn btn-primary"
        >
          Back to Groups
        </button>
      </div>
    );
  }
  
  if (!group) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 dark:text-gray-400">Group not found</p>
      </div>
    );
  }
  
  const isAdmin = group.createdBy === user.uid;
  const currencySymbol = getCurrencySymbol(group.currency || "USD");
  
  // Filter transactions by selected member
  const filteredTransactions = selectedMember
    ? transactions.filter(t => t.userId === selectedMember)
    : transactions;
  
  // Get member name for filtered transactions
  const selectedMemberName = selectedMember 
    ? members.find(m => m.id === selectedMember)?.displayName || 
      members.find(m => m.id === selectedMember)?.username || "User" 
    : "";
  
  return (
    <div className="animate-fadeIn">
      <div className="flex items-center mb-6">
        <button 
          onClick={() => navigate("/groups")} 
          className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 mr-4"
          aria-label="Go back"
        >
          <FaArrowLeft />
        </button>
        <div className="flex flex-col">
          <h1 className="heading-lg">{group.name}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {group.type === "budget" ? "Team Budget" : "Split Expenses"}
          </p>
        </div>
        <div className="ml-auto flex items-center">
            {group.type === "split" && (
                <button
                onClick={() => setShowTransferModal(true)}
                className="p-2 mr-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-primary"
                aria-label="Settle Up"
                title="Settle Up"
                >
                <FaExchangeAlt size={20} />
                </button>
            )}
            <button
                onClick={handleAddTransaction}
                className="p-2 mr-2 rounded-full bg-primary text-white hover:bg-primary-dark"
                aria-label="Add Transaction"
            >
                <FaPlus size={20} />
            </button>
            {/* This is the settings button that should only be visible to the group creator */}
            {isAdmin && (
                <button 
                onClick={handleSettings}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
                aria-label="Settings"
                >
                <FaCog size={20} />
                </button>
            )}
            </div>
      </div>
      
      {/* Group summary cards */}
      <div className="mb-6">
        {group.type === "budget" ? (
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="heading-sm">Budget</h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">{currencySymbol}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-gray-800 dark:text-white">
                  {group.budget?.toLocaleString()}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Budget</p>
              </div>
              
              <div className="text-right">
                <p className="text-3xl font-bold text-red-500">
                  {(group.spent || 0).toLocaleString()}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Spent</p>
              </div>
            </div>
            
            <div className="mt-4 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
              <div 
                className="bg-primary h-2.5 rounded-full" 
                style={{ width: `${Math.min(100, (group.spent || 0) / group.budget * 100)}%` }} 
              ></div>
            </div>
            
            <p className="mt-2 text-right text-sm text-gray-500 dark:text-gray-400">
              {currencySymbol}{(group.budget - (group.spent || 0)).toLocaleString()} remaining
            </p>
          </div>
        ) : settlements.length > 0 ? (
          <div className="card mb-4">
            <h2 className="p-4 border-b border-gray-100 dark:border-gray-700 heading-sm flex items-center">
              <FaExchangeAlt className="mr-2 text-primary" /> Settlement Plan
            </h2>
            <div className="p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                To settle all debts in this group, the following payments should be made:
              </p>
              <div className="space-y-3">
                {settlements.map((settlement, index) => {
                  const fromMember = members.find(m => m.id === settlement.from);
                  const toMember = members.find(m => m.id === settlement.to);
                  const isUserInvolved = settlement.from === user.uid || settlement.to === user.uid;
                  
                  return (
                    <div 
                      key={index}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        isUserInvolved ? 'bg-primary-light' : 'bg-gray-50 dark:bg-gray-700'
                      } ${settlement.settled ? 'opacity-50' : ''}`}
                    >
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center overflow-hidden">
                          {fromMember?.photoURL ? (
                            <img src={fromMember.photoURL} alt={fromMember.displayName || fromMember.username} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs font-medium">
                              {(fromMember?.displayName || fromMember?.username || "User").charAt(0)}
                            </span>
                          )}
                        </div>
                        <div className="mx-2">
                          <FaArrowRight className="text-gray-400" />
                        </div>
                        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center overflow-hidden">
                          {toMember?.photoURL ? (
                            <img src={toMember.photoURL} alt={toMember.displayName || toMember.username} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs font-medium">
                              {(toMember?.displayName || toMember?.username || "User").charAt(0)}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-1 mx-3">
                        <span className="text-sm">
                          <span className="font-medium">
                            {fromMember?.displayName || fromMember?.username || "User"}
                            {settlement.from === user.uid ? " (You)" : ""}
                          </span>
                          {" "}pays{" "}
                          <span className="font-medium">
                            {toMember?.displayName || toMember?.username || "User"}
                            {settlement.to === user.uid ? " (You)" : ""}
                          </span>
                        </span>
                      </div>
                      
                      <div className="flex items-center">
                        <div className="font-bold text-primary mr-2">
                          {currencySymbol}{settlement.amount.toFixed(2)}
                        </div>
                        
                        {isUserInvolved && !settlement.settled && (
                          <button
                            onClick={() => handleSettleDebt(settlement)}
                            className="p-2 rounded-full bg-green-500 hover:bg-green-600 text-white"
                            title="Mark as settled"
                          >
                            <FaHandshake size={16} />
                          </button>
                        )}
                        
                        {settlement.settled && (
                          <div className="bg-green-100 text-green-700 text-xs font-medium px-2 py-1 rounded-full flex items-center">
                            <FaCheck className="mr-1" /> Settled
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}
      
        {/* Member balances for both group types */}
        <div className="card">
          <h2 className="p-4 border-b border-gray-100 dark:border-gray-700 heading-sm">
            {group.type === "split" ? "Member Balances" : "Group Members"}
          </h2>
            
          {members.map(member => {
            const memberBalance = balances[member.id] || { spent: 0, total: 0 };
            const displayName = member.displayName || member.username || "User";
            const spentAmount = Math.abs(memberBalance.spent || 0);
              
            return (
              <div 
                key={member.id} 
                className="flex items-center justify-between py-3 px-4 border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                onClick={() => setSelectedMember(selectedMember === member.id ? null : member.id)}
              >
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                    {member.photoURL ? (
                      <img src={member.photoURL} alt={displayName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-medium">
                        {displayName.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div className="ml-3">
                    <p className="font-medium">
                      {displayName}
                      {member.id === user.uid && " (You)"}
                      {member.id === group.createdBy && " (Owner)"}
                    </p>
                    {group.type === "split" && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Spent: {currencySymbol}{spentAmount.toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
                {group.type === "split" && (
                  <div className="text-right">
                    {Math.abs(memberBalance.total) < 0.01 ? (
                      <p className="text-gray-500 dark:text-gray-400">Settled up</p>
                    ) : memberBalance.total > 0 ? (
                      <p className="text-green-500 font-semibold">
                        Gets {currencySymbol}{Math.abs(memberBalance.total).toFixed(2)}
                      </p>
                    ) : (
                      <p className="text-red-500 font-semibold">
                        Owes {currencySymbol}{Math.abs(memberBalance.total).toFixed(2)}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
            
          <button 
            onClick={() => setShowAddMemberModal(true)}
            className="flex items-center justify-center text-primary hover:text-primary-dark font-medium p-4"
          >
            <FaUserPlus className="mr-2" />
            Invite Friend
          </button>
        </div>
      </div>
      
      {/* Transactions section */}
      <div className="mb-20">
        <div className="flex items-center justify-between mb-4">
          <h2 className="heading-md">
            {selectedMember 
              ? `${selectedMemberName}'s Transactions`
              : "Transactions"
            }
          </h2>
          {selectedMember && (
            <button 
              onClick={() => setSelectedMember(null)}
              className="text-primary text-sm"
            >
              Show All
            </button>
          )}
        </div>
        
        {filteredTransactions.length > 0 ? (
          <div className="space-y-3">
            {filteredTransactions.map(transaction => {
              const transactionMember = members.find(m => m.id === transaction.userId);
              const memberName = transactionMember?.displayName || 
                                 transactionMember?.username || "Unknown";
              const amount = Number(transaction.amount);
              const isIncome = amount > 0;
              const isSettlement = transaction.category === "settlement";
              
              return (
                <div 
                  key={transaction.id}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleTransactionClick(transaction)}
                >
                  <div className="flex items-start">
                    {/* Category icon or member photo */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
                      isIncome 
                        ? "bg-green-100 dark:bg-green-900/30" 
                        : "bg-red-100 dark:bg-red-900/30"
                    }`}>
                      {transactionMember?.photoURL ? (
                        <img 
                          src={transactionMember.photoURL} 
                          alt={memberName} 
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : isIncome ? (
                        <span className="text-green-500 text-lg font-bold">+</span>
                      ) : (
                        <span className="text-red-500 text-lg font-bold">-</span>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium dark:text-white">
                            {isSettlement ? "Settlement" : transaction.category.charAt(0).toUpperCase() + transaction.category.slice(1)}
                            {transaction.userId !== user.uid && (
                              <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                                • {memberName}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {transaction.date ? new Date(transaction.date).toLocaleDateString() : ""} 
                          </div>
                        </div>
                        
                        <div className={`font-bold ${
                          isIncome 
                            ? "text-green-500" 
                            : "text-red-500"
                        }`}>
                          {isIncome ? "+" : ""}{currencySymbol}{Math.abs(amount).toFixed(2)}
                        </div>
                      </div>
                      
                      {transaction.description && (
                        <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                          {transaction.description.length > 50
                            ? transaction.description.substring(0, 50) + "..." 
                            : transaction.description}
                        </div>
                      )}
                      
                      {/* Split information */}
                      {transaction.splitWith && transaction.splitWith.length > 0 && (
                        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center">
                          <FaUsers className="mr-1" /> 
                          Split with {transaction.splitWith.length} {transaction.splitWith.length === 1 ? "person" : "people"}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 card">
            <FaReceipt className="mx-auto text-4xl text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No transactions yet</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Add a new transaction to get started
            </p>
          </div>
        )}
      </div>
      
      {/* Invite member modal */}
      {showAddMemberModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md">
            <h3 className="heading-md mb-4">Invite Friend to Group</h3>
            
            {friendProfiles.length > 0 ? (
              <div className="max-h-64 overflow-y-auto mb-4">
                {friendProfiles.map(friend => (
                  <div 
                    key={friend.uid}
                    className="flex items-center justify-between py-3 px-4 border-b border-gray-200 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden mr-3">
                        {friend.photoURL ? (
                          <img src={friend.photoURL} alt={friend.username} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-sm font-medium">
                            {friend.username?.charAt(0) || "U"}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{friend.username}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{friend.handle}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleInviteMember(friend.uid)}
                      className="bg-primary text-white px-3 py-1 rounded text-sm"
                    >
                      Invite
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 mb-4">
                <p className="text-gray-500 dark:text-gray-400">No friends available to invite</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  All your friends are already in this group or you haven't added any friends yet.
                </p>
              </div>
            )}
            
            <button
              type="button"
              onClick={() => setShowAddMemberModal(false)}
              className="btn btn-outline w-full"
            >
              Close
            </button>
          </div>
        </div>
      )}
      
      {/* Settlement Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="heading-md">Settlement Plan</h3>
              <button 
                onClick={() => setShowTransferModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>
            
            {settlements.length > 0 ? (
              <div className="space-y-4">
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                  Here's the most efficient way to settle all debts in this group:
                </p>
                
                {settlements.map((settlement, index) => {
                  const fromMember = members.find(m => m.id === settlement.from);
                  const toMember = members.find(m => m.id === settlement.to);
                  const fromName = fromMember?.displayName || fromMember?.username || "User";
                  const toName = toMember?.displayName || toMember?.username || "User";
                  
                  const isCurrentUser = settlement.from === user.uid || settlement.to === user.uid;
                  
                  return (
                    <div 
                      key={index}
                      className={`p-4 rounded-lg ${
                        settlement.settled ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' :
                        isCurrentUser ? 'bg-primary-light border border-primary' : 
                        'bg-gray-50 dark:bg-gray-700'
                      }`}
                    >
                      <div className="flex items-center mb-2">
                        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center overflow-hidden">
                          {fromMember?.photoURL ? (
                            <img src={fromMember.photoURL} alt={fromName} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-sm font-medium">{fromName.charAt(0)}</span>
                          )}
                        </div>
                        
                        <div className="mx-2 flex flex-col items-center">
                          <FaArrowRight className="text-primary" />
                          <span className="mt-1 text-xs font-medium bg-primary text-white px-2 py-0.5 rounded-full">
                            {currencySymbol}{settlement.amount.toFixed(2)}
                          </span>
                        </div>
                        
                        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center overflow-hidden">
                          {toMember?.photoURL ? (
                            <img src={toMember.photoURL} alt={toName} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-sm font-medium">{toName.charAt(0)}</span>
                          )}
                        </div>
                      </div>
                      
                      <p className={`text-sm ${isCurrentUser ? 'font-medium' : ''}`}>
                        <span className="font-medium">{fromName}</span>
                        {settlement.from === user.uid ? " (You)" : ""} pays{" "}
                        <span className="font-medium">{toName}</span>
                        {settlement.to === user.uid ? " (You)" : ""}
                      </p>
                      
                      {settlement.settled ? (
                        <div className="mt-2 pt-2 border-t border-green-200 dark:border-green-800">
                          <div className="flex items-center justify-center text-green-600 dark:text-green-400 text-sm">
                            <FaCheck className="mr-1" /> Settlement complete
                          </div>
                        </div>
                      ) : isCurrentUser && (
                        <div className="mt-2 pt-2 border-t border-primary-light">
                          <div className="flex items-center justify-between">
                            <div className="text-xs text-primary">
                              {settlement.from === user.uid ? (
                                <span>You need to pay this amount</span>
                              ) : (
                                <span>You will receive this amount</span>
                              )}
                            </div>
                            
                            <button
                              onClick={() => handleSettleDebt(settlement)}
                              className="bg-green-500 hover:bg-green-600 text-white text-xs px-2 py-1 rounded-full flex items-center"
                            >
                              <FaHandshake className="mr-1" /> Settle Up
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6">
                <FaMoneyBillWave className="mx-auto text-4xl text-gray-300 mb-3" />
                <p className="text-gray-600 dark:text-gray-400">No settlements needed</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Everyone is already settled up in this group.
                </p>
              </div>
            )}
            
            <button
              onClick={() => setShowTransferModal(false)}
              className="btn btn-primary w-full mt-4"
            >
              Close
            </button>
          </div>
        </div>
      )}
      
      {/* Transaction Detail Modal */}
      {showTransactionModal && selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 shadow-lg">
            <h2 className="text-xl font-bold mb-4">Transaction Details</h2>
            
            {/* Warning for settlement transactions */}
            {(selectedTransaction.category === "settlement" || 
             selectedTransaction.isSettlement || 
             selectedTransaction.isPartOfSettlement) && (
              <div className="mb-4 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-amber-700 dark:text-amber-400 text-sm">
                  {selectedTransaction.category === "settlement" 
                    ? "This is a settlement transaction and cannot be modified."
                    : "This transaction is part of a settlement. Editing it is not allowed to maintain settlement integrity."}
                </p>
              </div>
            )}
            
            <div className="space-y-4">
              <div className="flex items-center">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mr-4 ${
                  Number(selectedTransaction.amount) >= 0 
                    ? 'bg-green-100 dark:bg-green-900' 
                    : 'bg-red-100 dark:bg-red-900'
                }`}>
                  {getCategoryIcon(selectedTransaction.category)}
                </div>
                
                <div>
                  <p className="font-bold capitalize text-lg">
                    {selectedTransaction.category === "settlement" 
                      ? "Settlement" 
                      : selectedTransaction.category}
                  </p>
                  <p className={`text-xl font-bold ${
                    Number(selectedTransaction.amount) >= 0 
                      ? 'text-green-500' 
                      : 'text-red-500'
                  }`}>
                    {Number(selectedTransaction.amount) >= 0 ? '+' : ''}
                    {currencySymbol}{Math.abs(Number(selectedTransaction.amount)).toFixed(2)}
                  </p>
                </div>
              </div>
              
              <div className="border-t border-b border-gray-200 dark:border-gray-700 py-4 space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Added by</p>
                  <p>{members.find(m => m.id === selectedTransaction.userId)?.displayName || 
                      members.find(m => m.id === selectedTransaction.userId)?.username || 
                      "Unknown User"}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Date</p>
                  <p>{selectedTransaction.date ? new Date(selectedTransaction.date).toLocaleDateString() : ""}</p>
                </div>
                
                {selectedTransaction.description && (
                  <div>
                    <p className="text-sm text-gray-500">Description</p>
                    <p className="whitespace-pre-wrap">{selectedTransaction.description}</p>
                  </div>
                )}
                
                {selectedTransaction.splitWith && selectedTransaction.splitWith.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-500">Split with</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedTransaction.splitWith.map(memberId => {
                        const member = members.find(m => m.id === memberId);
                        return (
                          <div 
                            key={memberId}
                            className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-full px-2 py-1"
                          >
                            <div className="w-5 h-5 rounded-full bg-gray-300 dark:bg-gray-600 mr-1 flex items-center justify-center overflow-hidden">
                              {member?.photoURL ? (
                                <img src={member.photoURL} alt={member.displayName} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-xs">
                                  {(member?.displayName || member?.username || "?").charAt(0)}
                                </span>
                              )}
                            </div>
                            <span className="text-xs">{member?.displayName || member?.username || "Unknown"}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Edit button - only show if not a settlement transaction and user is the creator */}
              {selectedTransaction.userId === user.uid && 
               selectedTransaction.amount < 0 &&
               !selectedTransaction.category === "settlement" && 
               !selectedTransaction.isSettlement &&
               !selectedTransaction.isPartOfSettlement && (
                <div className="flex space-x-3">
                  <button 
                    className="flex-1 py-2 bg-blue-500 text-white rounded-lg flex items-center justify-center"
                    onClick={() => {
                      navigate(`/group/${groupId}/edit-transaction/${selectedTransaction.id}`);
                      setShowTransactionModal(false);
                    }}
                  >
                    <FaEdit className="mr-2" />
                    Edit
                  </button>
                </div>
              )}
              
              <button 
                className="w-full py-2 text-center text-gray-500"
                onClick={() => setShowTransactionModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupDetail;