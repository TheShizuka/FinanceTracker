// src/components/AnimatedTransactionList.jsx
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const AnimatedTransactionList = ({ children }) => {
  // Container variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  // Item variants
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { 
      opacity: 1, 
      y: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 24
      }
    },
    exit: { 
      opacity: 0, 
      y: -20,
      transition: {
        duration: 0.2
      }
    }
  };

  // Convert children to array if needed
  const childrenArray = React.Children.toArray(children);

  return (
    <AnimatePresence>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-3"
      >
        {childrenArray.map((child, index) => (
          <motion.div
            key={child.key || index}
            variants={itemVariants}
            exit="exit"
            layout
            className="transaction-item"
          >
            {child}
          </motion.div>
        ))}
      </motion.div>
    </AnimatePresence>
  );
};

export default AnimatedTransactionList;