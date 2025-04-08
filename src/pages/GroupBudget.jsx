// src/pages/GroupBudget.jsx
import { useState, useEffect } from "react";
import { collection, addDoc, onSnapshot, query, where, doc, updateDoc, getDoc, arrayUnion } from "firebase/firestore";
import { auth, db } from "../firebase";
import { toast } from "react-toastify";

const GroupBudget = () => {
  const [groupName, setGroupName] = useState("");
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [transactionAmount, setTransactionAmount] = useState("");
  const [transactionCategory, setTransactionCategory] = useState("food");
  const [transactionDate, setTransactionDate] = useState("");
  const [transactionNotes, setTransactionNotes] = useState("");
  const [newGroupBudget, setNewGroupBudget] = useState("");
  const user = auth.currentUser;

  useEffect(() => {
    if (user) {
      const q = query(collection(db, "groups"), where("members", "array-contains", user.uid));
      const unsub = onSnapshot(q, (snapshot) => {
        setGroups(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      });
      return () => unsub();
    }
  }, [user]);

  const createGroup = async (e) => {
    e.preventDefault();
    if (!user) return;
    try {
      await addDoc(collection(db, "groups"), {
        name: groupName,
        members: [user.uid],
        budget: 0,
        transactions: [],
      });
      setGroupName("");
      toast.success("Group created!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to create group.");
    }
  };

  const addGroupTransaction = async (e) => {
    e.preventDefault();
    if (!user || !selectedGroup) return;
    try {
      const groupRef = doc(db, "groups", selectedGroup.id);
      await updateDoc(groupRef, {
        transactions: arrayUnion({
          amount: Number(transactionAmount),
          category: transactionCategory,
          date: transactionDate,
          notes: transactionNotes,
          userId: user.uid,
        }),
      });
      toast.success("Transaction added!");
      setTransactionAmount("");
      setTransactionCategory("food");
      setTransactionDate("");
      setTransactionNotes("");
    } catch (error) {
      console.error(error);
      toast.error("Failed to add transaction.");
    }
  };

  const updateGroupBudget = async (e) => {
    e.preventDefault();
    if (!user || !selectedGroup) return;
    try {
      const groupRef = doc(db, "groups", selectedGroup.id);
      await updateDoc(groupRef, {
        budget: Number(newGroupBudget),
      });
      toast.success("Group budget updated!");
      setNewGroupBudget("");
    } catch (error) {
      console.error(error);
      toast.error("Failed to update group budget.");
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Group Budgets</h1>
      {/* Create Group */}
      <form onSubmit={createGroup} className="mb-4 p-4 bg-white dark:bg-gray-800 rounded shadow">
        <input
          type="text"
          placeholder="Group Name"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
          required
        />
        <button type="submit" className="mt-2 p-2 bg-blue-500 text-white rounded hover:bg-blue-600">
          Create Group
        </button>
      </form>
      {/* List Groups */}
      <div className="mb-4">
        <h2 className="text-xl font-bold">Your Groups</h2>
        {groups.map((group) => (
          <div
            key={group.id}
            className={`p-4 bg-white dark:bg-gray-800 rounded shadow mt-2 cursor-pointer ${selectedGroup && selectedGroup.id === group.id ? "border-2 border-blue-500" : ""}`}
            onClick={() => setSelectedGroup(group)}
          >
            <h3 className="text-lg font-bold">{group.name}</h3>
            <p>Members: {group.members.length}</p>
          </div>
        ))}
      </div>
      {selectedGroup && (
        <div className="p-4 bg-white dark:bg-gray-800 rounded shadow">
          <h2 className="text-xl font-bold">{selectedGroup.name} Details</h2>
          <p><strong>Group Budget:</strong> ${selectedGroup.budget}</p>
          <form onSubmit={updateGroupBudget} className="mt-2 flex items-center space-x-2">
            <input
              type="number"
              placeholder="Update Budget"
              value={newGroupBudget}
              onChange={(e) => setNewGroupBudget(e.target.value)}
              className="p-2 border rounded dark:bg-gray-700 dark:text-white"
              required
            />
            <button type="submit" className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600">
              Update Budget
            </button>
          </form>
          <h3 className="text-lg font-bold mt-4">Transactions</h3>
          {selectedGroup.transactions?.map((t, idx) => (
            <div key={idx} className="border-b border-gray-200 dark:border-gray-700 py-2">
              <p>{t.amount} by {t.userId}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t.notes}</p>
            </div>
          ))}
          {/* Add Transaction */}
          <form onSubmit={addGroupTransaction} className="mt-4 space-y-4">
            <input
              type="number"
              placeholder="Amount"
              value={transactionAmount}
              onChange={(e) => setTransactionAmount(e.target.value)}
              className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
              required
            />
            <select
              value={transactionCategory}
              onChange={(e) => setTransactionCategory(e.target.value)}
              className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
            >
              <option value="food">Food</option>
              <option value="transport">Transport</option>
              <option value="entertainment">Entertainment</option>
              <option value="utilities">Utilities</option>
            </select>
            <input
              type="date"
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
              className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
              required
            />
            <textarea
              placeholder="Notes (optional)"
              value={transactionNotes}
              onChange={(e) => setTransactionNotes(e.target.value)}
              className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
            />
            <button type="submit" className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600">
              Add Transaction
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default GroupBudget;
