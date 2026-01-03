import React, { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring, AnimatePresence } from 'framer-motion';

const CustomCursor = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const [ripples, setRipples] = useState([]);

  // Mouse position values
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth spring animation for the trailing circle
  // Tuned for a "Fluid" yet "Responsive" feel
  const springConfig = { damping: 28, stiffness: 350, mass: 0.5 };
  const cursorX = useSpring(mouseX, springConfig);
  const cursorY = useSpring(mouseY, springConfig);

  useEffect(() => {
    const moveCursor = (e) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
      if (!isVisible) setIsVisible(true);

      // Smart Hover Detection
      const target = e.target;
      const isClickable =
        target.tagName === 'BUTTON' ||
        target.tagName === 'A' ||
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.closest('button') ||
        target.closest('a') ||
        window.getComputedStyle(target).cursor === 'pointer';

      setIsHovering(isClickable);
    };

    const handleMouseDown = (e) => {
      setIsClicking(true);
      // Spawn a ripple
      const newRipple = {
        id: Date.now(),
        x: e.clientX,
        y: e.clientY
      };
      setRipples((prev) => [...prev, newRipple]);

      // Cleanup ripple after animation
      setTimeout(() => {
        setRipples((prev) => prev.filter(r => r.id !== newRipple.id));
      }, 800);
    };

    const handleMouseUp = () => setIsClicking(false);

    // Visibility handling
    const handleMouseEnter = () => setIsVisible(true);
    const handleMouseLeave = () => setIsVisible(false);

    window.addEventListener("mousemove", moveCursor);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
    document.body.addEventListener("mouseenter", handleMouseEnter);
    document.body.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("mousemove", moveCursor);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      document.body.removeEventListener("mouseenter", handleMouseEnter);
      document.body.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [mouseX, mouseY, isVisible]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      <AnimatePresence>
        {/* Click Ripples */}
        {ripples.map((ripple) => (
          <motion.div
            key={ripple.id}
            initial={{ opacity: 0.8, scale: 0, width: 0, height: 0 }}
            animate={{ opacity: 0, scale: 2.5, width: 50, height: 50 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="fixed rounded-full border border-emerald-400 bg-emerald-400/20"
            style={{
              left: ripple.x,
              top: ripple.y,
              x: "-50%",
              y: "-50%",
            }}
          />
        ))}
      </AnimatePresence>

      {/* Main Trailing Ring - The "Fluid" Body */}
      <motion.div
        className="fixed top-0 left-0 border border-emerald-500/60 rounded-full mix-blend-screen backdrop-blur-[1px]"
        animate={{
          width: isHovering ? 50 : 24,
          height: isHovering ? 50 : 24,
          backgroundColor: isHovering ? "rgba(16, 185, 129, 0.05)" : "rgba(16, 185, 129, 0)",
          borderColor: isHovering ? "rgba(16, 185, 129, 0.6)" : "rgba(16, 185, 129, 0.3)",
          scale: isClicking ? 0.8 : 1,
          opacity: isVisible ? 1 : 0,
        }}
        style={{
          x: cursorX,
          y: cursorY,
          translateX: "-50%",
          translateY: "-50%",
        }}
        transition={{ duration: 0.15, ease: "linear" }}
      />

      {/* Center Dot - The "Precise" Head */}
      <motion.div
        className="fixed top-0 left-0 bg-emerald-400 rounded-full shadow-[0_0_15px_#34d399] mix-blend-screen"
        animate={{
          scale: isHovering ? 0.5 : 1, // Shrink slightly on hover to give focus to ring
          opacity: isVisible ? (isHovering ? 0.9 : 1) : 0,
        }}
        style={{
          x: mouseX,
          y: mouseY,
          width: 8,
          height: 8,
          translateX: "-50%",
          translateY: "-50%",
        }}
        transition={{ duration: 0.1 }}
      />
    </div>
  );
};

export default CustomCursor;
