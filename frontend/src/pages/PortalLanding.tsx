import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useUIStore } from "../stores/useUIStore";

const portals = [
  {
    id: "stuco",
    label: "Student Council",
    description: "Manage student government \u2014 events, budgets, proposals, and elections.",
    accent: "#8b3b8b",
    icon: "SC",
  },
  {
    id: "developers",
    label: "Developers Club",
    description: "Code, collaborate, and ship \u2014 project tracking, tasks, and team tools.",
    accent: "#0f62fe",
    icon: "DC",
  },
] as const;

function PortalCard({
  portal,
  index,
  onSelect,
}: {
  portal: (typeof portals)[number];
  index: number;
  onSelect: (id: "developers" | "stuco") => void;
}) {
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 + index * 0.15, duration: 0.5, ease: "easeOut" }}
      whileHover={{ scale: 1.03, y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(portal.id)}
      style={{
        position: "relative",
        display: "flex",
        width: "100%",
        maxWidth: "26rem",
        flexDirection: "column",
        alignItems: "center",
        overflow: "hidden",
        borderRadius: "1rem",
        border: `1px solid ${portal.accent}44`,
        padding: "2rem",
        textAlign: "left",
        cursor: "pointer",
        background: `linear-gradient(135deg, ${portal.accent}22, ${portal.accent}44)`,
        boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
        backdropFilter: "blur(8px)",
        color: "#fff",
        outline: "none",
        transition: "box-shadow 0.2s",
      }}
      onFocus={(e) => {
        e.currentTarget.style.boxShadow = `0 0 0 2px ${portal.accent}88`;
      }}
      onBlur={(e) => {
        e.currentTarget.style.boxShadow = "0 25px 50px -12px rgba(0,0,0,0.5)";
      }}
      aria-label={`Select ${portal.label} portal`}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.1,
          transition: "opacity 0.2s",
          pointerEvents: "none",
          background: `radial-gradient(circle at 50% 0%, ${portal.accent}88, transparent 70%)`,
        }}
        className="portal-glow"
      />
      <div
        style={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "1rem",
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            height: "5rem",
            width: "5rem",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "50%",
            background: portal.accent,
            color: "#fff",
            fontSize: "1.5rem",
            fontWeight: 700,
            boxShadow: `0 4px 14px ${portal.accent}66`,
          }}
        >
          {portal.icon}
        </div>
        <h2 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, color: "#fff" }}>
          {portal.label}
        </h2>
        <p
          style={{
            margin: 0,
            fontSize: "0.875rem",
            lineHeight: 1.6,
            color: "rgba(255,255,255,0.7)",
          }}
        >
          {portal.description}
        </p>
        <div
          style={{
            marginTop: "0.5rem",
            borderRadius: "999px",
            padding: "0.375rem 1rem",
            fontSize: "0.75rem",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "#fff",
            background: portal.accent,
            opacity: 0,
            transition: "opacity 0.2s",
          }}
          className="portal-cta"
        >
          Enter Portal
        </div>
      </div>
      <style>{`
        button:hover .portal-glow { opacity: 0.2; }
        button:hover .portal-cta { opacity: 1; }
      `}</style>
    </motion.button>
  );
}

export function PortalLanding() {
  const navigate = useNavigate();
  const portal = useUIStore((s) => s.portal);
  const setPortal = useUIStore((s) => s.setPortal);

  useEffect(() => {
    if (portal) {
      navigate(`/${portal}/dashboard`, { replace: true });
    }
  }, [portal, navigate]);

  function handleSelect(id: "developers" | "stuco") {
    setPortal(id);
    navigate(`/${id}/dashboard`);
  }

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        minHeight: "100vh",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        background: "#000",
      }}
    >
      {/* Animated background shapes */}
      <div
        style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}
        aria-hidden="true"
      >
        <motion.div
          style={{
            position: "absolute",
            left: "-8rem",
            top: "-8rem",
            width: "24rem",
            height: "24rem",
            borderRadius: "50%",
            opacity: 0.2,
            background: "#8b3b8b",
            filter: "blur(80px)",
          }}
          animate={{ x: [0, 50, 0], y: [0, -30, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          style={{
            position: "absolute",
            bottom: "-8rem",
            right: "-8rem",
            width: "24rem",
            height: "24rem",
            borderRadius: "50%",
            opacity: 0.2,
            background: "#0f62fe",
            filter: "blur(80px)",
          }}
          animate={{ x: [0, -40, 0], y: [0, 40, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: "16rem",
            height: "16rem",
            transform: "translate(-50%, -50%)",
            borderRadius: "50%",
            opacity: 0.1,
            background: "#fff",
            filter: "blur(80px)",
          }}
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Content */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "3rem",
          padding: "0 1rem",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          style={{ textAlign: "center" }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: "3rem",
              fontWeight: 700,
              letterSpacing: "-0.025em",
              color: "#fff",
            }}
          >
            General Portal
          </h1>
          <p style={{ marginTop: "0.75rem", fontSize: "1.125rem", color: "rgba(255,255,255,0.5)" }}>
            Choose your organization to get started
          </p>
        </motion.div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {portals.map((p, i) => (
            <PortalCard key={p.id} portal={p} index={i} onSelect={handleSelect} />
          ))}
        </div>
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.5 }}
        style={{
          position: "relative",
          zIndex: 10,
          marginTop: "4rem",
          fontSize: "0.75rem",
          color: "rgba(255,255,255,0.3)",
        }}
      >
        Select a portal to continue. You can switch portals later from settings.
      </motion.p>
    </div>
  );
}
