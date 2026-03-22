"use client";

import { useEffect, useState, useRef } from "react";
import { motion, useInView } from "framer-motion";

export default function AnimatedCounter({ value, duration = 1.8, suffix = "", prefix = "", className = "" }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const steps = 40;
    const step = value / steps;
    const interval = (duration * 1000) / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += step;
      if (current >= value) { setCount(value); clearInterval(timer); }
      else setCount(Math.floor(current));
    }, interval);
    return () => clearInterval(timer);
  }, [inView, value, duration]);

  return (
    <motion.span
      ref={ref}
      initial={{ opacity: 0, y: 10 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.4 }}
      className={className}
    >
      {prefix}{count}{suffix}
    </motion.span>
  );
}
