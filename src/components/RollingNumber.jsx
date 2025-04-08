// src/components/RollingNumber.jsx
import { useEffect, useRef } from "react";
import { animate } from "framer-motion";

const RollingNumber = ({ value, formatter = (val) => val.toFixed(2), duration = 0.8 }) => {
  const nodeRef = useRef();

  useEffect(() => {
    const node = nodeRef.current;
    if (node) {
      const controls = animate(0, value, {
        duration,
        onUpdate: (value) => {
          node.textContent = formatter(value);
        },
        ease: "easeOut"
      });
      
      return () => controls.stop();
    }
  }, [value, formatter, duration]);

  return <span ref={nodeRef}>{formatter(0)}</span>;
};

export default RollingNumber;