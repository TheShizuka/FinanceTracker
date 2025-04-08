// src/components/ImportTransactionsModal.jsx
import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { FaFileExcel, FaDownload, FaUpload, FaTimes, FaCheck, FaExclamationCircle } from "react-icons/fa";
import * as XLSX from "xlsx";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { db } from "../firebase";

const ImportTransactionsModal = ({ isOpen, onClose, userId, budgetId, onSuccess }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [importStatus, setImportStatus] = useState("idle"); // idle, processing, ready, importing, success, error, partial
  const [importData, setImportData] = useState(null);
  const [importResults, setImportResults] = useState({ success: 0, errors: 0, errorDetails: [] });
  const fileInputRef = useRef(null);
  
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length) {
      processFile(files[0]);
    }
  };
  
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length) {
      processFile(e.target.files[0]);
    }
  };
  
  const processFile = (file) => {
    setFile(file);
    setImportStatus("processing");
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(worksheet);
        
        // Basic validation
        if (rawData.length === 0) {
          setImportStatus("error");
          setImportResults({
            success: 0,
            errors: 1,
            errorDetails: ["File contains no data"]
          });
          return;
        }
        
        // Clean data and standardize headers
        const jsonData = rawData.map(item => {
          const cleanItem = {};
          
          // Process each field in the item
          Object.keys(item).forEach(key => {
            // Clean key - remove parentheses and extra text, trim whitespace
            let cleanKey = key.replace(/\([^)]*\)/g, '').trim().toLowerCase();
            
            // Further normalize keys
            if (cleanKey.includes('date')) cleanKey = 'date';
            if (cleanKey.includes('amount')) cleanKey = 'amount';
            if (cleanKey.includes('category')) cleanKey = 'category';
            if (cleanKey.includes('note') || cleanKey.includes('description')) cleanKey = 'notes';
            
            // Clean value
            let cleanValue = item[key];
            if (typeof cleanValue === 'string') {
              cleanValue = cleanValue.replace(/\([^)]*\)/g, '').trim();
            }
            
            cleanItem[cleanKey] = cleanValue;
          });
          
          return cleanItem;
        });
        
        // Check if all required fields are present
        const requiredFields = ["date", "amount", "category"];
        const hasAllFields = jsonData.every(item => 
          requiredFields.every(field => Object.keys(item).includes(field))
        );
        
        if (!hasAllFields) {
          setImportStatus("error");
          setImportResults({
            success: 0,
            errors: 1,
            errorDetails: ["File is missing required columns: date, amount, category"]
          });
          return;
        }
        
        setImportData(jsonData);
        setImportStatus("ready");
      } catch (error) {
        console.error("Error parsing Excel file:", error);
        setImportStatus("error");
        setImportResults({
          success: 0,
          errors: 1,
          errorDetails: [error.message || "Failed to parse Excel file"]
        });
      }
    };
    
    reader.onerror = () => {
      setImportStatus("error");
      setImportResults({
        success: 0,
        errors: 1,
        errorDetails: ["Failed to read file"]
      });
    };
    
    reader.readAsArrayBuffer(file);
  };
  
  const handleImport = async () => {
    if (!importData || importData.length === 0 || !userId || !budgetId) return;
    
    setImportStatus("importing");
    const results = { success: 0, errors: 0, errorDetails: [] };
    
    for (const item of importData) {
      try {
        // Format the date consistently
        let transactionDate;
        if (typeof item.date === 'string') {
          // Clear parentheses and extra content
          const cleanDateStr = item.date.replace(/\([^)]*\)/g, '').trim();
          
          // Try to parse date string (supports multiple formats)
          transactionDate = new Date(cleanDateStr);
          if (isNaN(transactionDate.getTime())) {
            // Fall back to Excel date parsing if standard parsing fails
            const excelDateValue = parseFloat(cleanDateStr);
            if (!isNaN(excelDateValue)) {
              // Convert Excel date (days since 1900-01-01) to JS date
              transactionDate = new Date(Math.round((excelDateValue - 25569) * 86400 * 1000));
            } else {
              throw new Error(`Invalid date format for row ${results.success + results.errors + 1}`);
            }
          }
        } else if (typeof item.date === 'number') {
          // Handle Excel date number format
          transactionDate = new Date(Math.round((item.date - 25569) * 86400 * 1000));
        } else {
          throw new Error(`Invalid date format for row ${results.success + results.errors + 1}`);
        }
        
        // Format date as YYYY-MM-DD string
        const formattedDate = transactionDate.toISOString().split('T')[0];
        
        // Validate amount - handle string with possible parentheses
        let amountStr = String(item.amount).replace(/[\(\)]/g, '').trim();
        // Support both comma and period as decimal separators
        amountStr = amountStr.replace(/,/g, '.');
        
        // Handle negative numbers in parentheses like (10.00) -> -10.00
        if (String(item.amount).includes('(') && String(item.amount).includes(')')) {
          amountStr = '-' + amountStr;
        }
        
        const amount = Number(amountStr);
        
        if (isNaN(amount)) {
          throw new Error(`Invalid amount for row ${results.success + results.errors + 1}`);
        }
        
        // Clean category - remove parentheses and extra text, trim whitespace
        const category = String(item.category || "").replace(/\([^)]*\)/g, '').trim().toLowerCase();
        
        // Clean notes - handle undefined/null, remove parentheses, trim
        const notes = item.notes 
          ? String(item.notes).replace(/\([^)]*\)/g, '').trim() 
          : "";
        
        // Create transaction object
        const transaction = {
          userId,
          budgetId,
          date: formattedDate,
          amount,
          category,
          notes,
          createdAt: Timestamp.now()
        };
        
        // Add to Firestore
        await addDoc(collection(db, "transactions"), transaction);
        results.success++;
      } catch (error) {
        console.error("Error importing transaction:", error);
        results.errors++;
        results.errorDetails.push(error.message || `Failed to import row ${results.success + results.errors}`);
      }
    }
    
    setImportResults(results);
    setImportStatus(results.errors === 0 ? "success" : "partial");
    
    if (results.success > 0 && onSuccess) {
      onSuccess(results.success);
    }
  };
  
  const downloadTemplate = () => {
    // Create template worksheet
    const template = [
      {
        date: new Date().toISOString().split('T')[0],
        amount: -12.50,
        category: "food",
        notes: "Example expense"
      },
      {
        date: new Date().toISOString().split('T')[0],
        amount: -25.00,
        category: "shopping",
        notes: "Groceries"
      },
      {
        date: new Date().toISOString().split('T')[0],
        amount: 100.00,
        category: "other",
        notes: "Income example"
      }
    ];
    
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transactions");
    
    // Add column headers 
    XLSX.utils.sheet_add_aoa(ws, [
      ["date", "amount", "category", "notes"]
    ], { origin: "A1" });
    
    // Add instructions after data
    XLSX.utils.sheet_add_aoa(ws, [
      ["", "", "", ""],
      ["Instructions:", "", "", ""],
      ["date", "Use YYYY-MM-DD format", "", ""],
      ["amount", "Negative for expenses, positive for income", "", ""],
      ["category", "Use one of: food, shopping, transport, housing, entertainment, utilities, other", "", ""],
      ["notes", "Optional description", "", ""]
    ], { origin: `A${template.length + 3}` });
    
    // Auto-size columns
    ws['!cols'] = [
      { wch: 12 }, // date
      { wch: 12 }, // amount
      { wch: 15 }, // category 
      { wch: 30 } // notes
    ];
    
    // Save file
    XLSX.writeFile(wb, "transaction_import_template.xlsx");
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <motion.div 
        className="bg-white dark:bg-gray-800 rounded-xl max-w-xl w-full p-6 shadow-xl"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Import Transactions</h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
          >
            <FaTimes />
          </button>
        </div>
        
        {importStatus === "idle" || importStatus === "processing" || importStatus === "ready" ? (
          <>
            <div 
              className={`border-2 border-dashed rounded-lg p-8 mb-6 text-center transition-colors ${
                isDragging 
                  ? "border-primary bg-primary/5" 
                  : "border-gray-300 dark:border-gray-600 hover:border-primary dark:hover:border-primary"
              }`}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
              />
              
              <div className="flex flex-col items-center">
                <FaFileExcel className="text-5xl mb-3 text-primary" />
                
                {file ? (
                  <div className="space-y-2">
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {importStatus === "processing" ? (
                        <span>Processing file...</span>
                      ) : (
                        <span>Ready to import {importData?.length} transactions</span>
                      )}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-lg font-medium">Drag & Drop Excel File Here</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      or <button 
                        type="button"
                        className="text-primary hover:underline"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        browse files
                      </button>
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row gap-3 mb-2">
              <button
                type="button"
                className="flex-1 btn flex items-center justify-center bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-white"
                onClick={downloadTemplate}
              >
                <FaDownload className="mr-2" />
                Download Template
              </button>
              
              <button
                type="button"
                className={`flex-1 btn flex items-center justify-center ${
                  importStatus === "ready" 
                    ? "bg-primary hover:bg-primary-dark text-white"
                    : "bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                }`}
                onClick={handleImport}
                disabled={importStatus !== "ready"}
              >
                <FaUpload className="mr-2" />
                Import Transactions
              </button>
            </div>
            
            <div className="mt-4">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Required Columns:</p>
              <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1 ml-5 list-disc">
                <li><strong>date</strong> - Date in YYYY-MM-DD format (e.g., 2025-03-09)</li>
                <li><strong>amount</strong> - Negative for expenses, positive for income</li>
                <li><strong>category</strong> - One of: food, shopping, transport, housing, entertainment, utilities, other</li>
                <li><strong>notes</strong> - Optional description</li>
              </ul>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic">
                Download our template for a proper format example. Parentheses in headings or values will be automatically removed.
              </p>
            </div>
          </>
        ) : (
          <div className="text-center py-6">
            {importStatus === "importing" ? (
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
                <p className="text-lg font-medium">Importing Transactions...</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Please wait, this may take a moment.</p>
              </div>
            ) : importStatus === "success" ? (
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
                  <FaCheck className="text-green-500 text-2xl" />
                </div>
                <p className="text-lg font-medium mb-2">Import Successful!</p>
                <p className="text-gray-600 dark:text-gray-300">
                  Successfully imported {importResults.success} transactions.
                </p>
                <button
                  type="button"
                  className="mt-6 btn bg-primary hover:bg-primary-dark text-white"
                  onClick={onClose}
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mb-4">
                  <FaExclamationCircle className="text-red-500 text-2xl" />
                </div>
                <p className="text-lg font-medium mb-2">
                  {importStatus === "partial" ? "Partially Completed" : "Import Failed"}
                </p>
                
                {importStatus === "partial" ? (
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    Successfully imported {importResults.success} transactions.<br />
                    Failed to import {importResults.errors} transactions.
                  </p>
                ) : (
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    There was a problem importing your transactions.
                  </p>
                )}
                
                {importResults.errorDetails.length > 0 && (
                  <div className="mt-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 rounded-lg p-3 text-left w-full max-h-32 overflow-y-auto">
                    <p className="text-sm font-medium text-red-800 dark:text-red-300 mb-1">Errors:</p>
                    <ul className="text-xs text-red-700 dark:text-red-400 list-disc pl-5">
                      {importResults.errorDetails.slice(0, 5).map((error, i) => (
                        <li key={i}>{error}</li>
                      ))}
                      {importResults.errorDetails.length > 5 && (
                        <li>...and {importResults.errorDetails.length - 5} more errors</li>
                      )}
                    </ul>
                  </div>
                )}
                
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    className="btn bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-white"
                    onClick={() => {
                      setFile(null);
                      setImportData(null);
                      setImportStatus("idle");
                    }}
                  >
                    Try Again
                  </button>
                  
                  <button
                    type="button"
                    className="btn bg-red-500 hover:bg-red-600 text-white"
                    onClick={onClose}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default ImportTransactionsModal;