// src/components/AnimatedList.jsx
import React from "react";
import { motion, AnimatePresence } from "framer-motion";

const AnimatedList = ({ children, staggerDelay = 0.05 }) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: staggerDelay }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 300, damping: 24 }
    },
    exit: { opacity: 0, y: -10 }
  };

  const childrenArray = React.Children.toArray(children);

  return (
    <AnimatePresence>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="stagger-list"
      >
        {childrenArray.map((child, index) => (
          <motion.div
            key={child.key || `item-${index}`}
            variants={itemVariants}
            layout
            className="stagger-item"
          >
            {child}
          </motion.div>
        ))}
      </motion.div>
    </AnimatePresence>
  );
};

export default AnimatedList;