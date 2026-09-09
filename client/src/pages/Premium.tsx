import { useState } from "react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";

export default function Premium() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const getCurrentPlanQuery = trpc.subscription.getCurrentPlan.useQuery();
  const getPlansQuery = trpc.subscription.getPlans.useQuery();

  const plans = getPlansQuery.data || [];
  const currentPlan = getCurrentPlanQuery.data;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0f0e17 0%, #1a1a2e 50%, #16213e 100%)",
        fontFamily: "'Georgia', 'Times New Roman', serif",
        padding: "40px 20px",
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "60px" }}>
        <h1
          style={{
            fontSize: "clamp(28px, 6vw, 46px)",
            fontWeight: 900,
            color: "#f4a261",
            margin: "0 0 16px",
            letterSpacing: "-1px",
          }}
        >
          💎 Premium Plans
        </h1>
        <p style={{ color: "#b0b0b0", fontSize: "18px", margin: "0" }}>
          Unlock unlimited book summaries and premium features
        </p>
      </div>

      {/* Plans Grid */}
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "24px",
          marginBottom: "60px",
        }}
      >
        {plans.map((plan) => (
          <div
            key={plan.id}
            style={{
              padding: "30px",
              background: plan.price === 0 ? "#1a1a2e" : "#2a2a3e",
              border: plan.price === 0 ? "2px solid #f4a261" : "2px solid #2a2a3e",
              borderRadius: "12px",
              position: "relative",
              transition: "all 0.3s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px)";
              (e.currentTarget as HTMLDivElement).style.boxShadow = "0 10px 30px rgba(244, 162, 97, 0.2)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
              (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
            }}
          >
            {plan.price === 0 && (
              <div
                style={{
                  position: "absolute",
                  top: "-12px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "#f4a261",
                  color: "#0f0e17",
                  padding: "4px 12px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: "bold",
                }}
              >
                POPULAR
              </div>
            )}

            <h2 style={{ color: "#f4a261", fontSize: "24px", margin: "0 0 8px", fontWeight: "bold" }}>
              {plan.name}
            </h2>
            <p style={{ color: "#b0b0b0", margin: "0 0 20px", fontSize: "14px" }}>
              {plan.description}
            </p>

            <div style={{ marginBottom: "20px" }}>
              <span style={{ fontSize: "36px", fontWeight: "bold", color: "#fff" }}>
                ₹{plan.price}
              </span>
              {plan.price > 0 && <span style={{ color: "#b0b0b0", marginLeft: "8px" }}>/month</span>}
            </div>

            <div style={{ marginBottom: "24px" }}>
              <p style={{ color: "#f4a261", fontSize: "14px", fontWeight: "bold", margin: "0 0 12px" }}>
                Features:
              </p>
              <ul style={{ margin: "0", padding: "0", listStyle: "none" }}>
                <li style={{ color: "#b0b0b0", marginBottom: "8px", fontSize: "14px" }}>
                  ✅ {plan.summariesPerDay} summaries per day
                </li>
                {plan.features?.map((feature, idx) => (
                  <li key={idx} style={{ color: "#b0b0b0", marginBottom: "8px", fontSize: "14px" }}>
                    ✅ {feature}
                  </li>
                ))}
              </ul>
            </div>

            <Button
              onClick={() => {
                if (!user) {
                  setLocation("/");
                } else {
                  alert("Premium subscription coming soon! 🚀");
                }
              }}
              style={{
                width: "100%",
                padding: "12px 24px",
                background: plan.price === 0 ? "transparent" : "#f4a261",
                color: plan.price === 0 ? "#f4a261" : "#0f0e17",
                border: plan.price === 0 ? "2px solid #f4a261" : "none",
                borderRadius: "8px",
                fontWeight: "bold",
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              {plan.price === 0 ? "Current Plan" : "Upgrade Now"}
            </Button>
          </div>
        ))}
      </div>

      {/* FAQ Section */}
      <div style={{ maxWidth: "800px", margin: "0 auto", paddingTop: "40px", borderTop: "2px solid #2a2a3e" }}>
        <h2 style={{ color: "#f4a261", fontSize: "28px", marginBottom: "30px", textAlign: "center" }}>
          ❓ Frequently Asked Questions
        </h2>

        <div style={{ display: "grid", gap: "20px" }}>
          {[
            {
              q: "Does the free plan have limits?",
              a: "Yes, the free plan includes 5 summaries per day. Premium plans offer unlimited summaries.",
            },
            {
              q: "How do I cancel my subscription?",
              a: "You can cancel anytime from your account settings. No hidden charges or long-term commitments.",
            },
            {
              q: "What is your refund policy?",
              a: "We offer a 30-day money-back guarantee. If you're not satisfied, we'll refund your entire payment.",
            },
            {
              q: "Can I change my plan later?",
              a: "Yes! You can upgrade or downgrade your plan anytime. Changes take effect immediately.",
            },
            {
              q: "Are the summaries accurate?",
              a: "Our AI summaries are generated based on the actual book content. We always recommend reading the full book for complete understanding.",
            },
          ].map((faq, idx) => (
            <div key={idx} style={{ padding: "16px", background: "#1a1a2e", borderRadius: "8px" }}>
              <p style={{ color: "#f4a261", fontWeight: "bold", margin: "0 0 8px" }}>
                {faq.q}
              </p>
              <p style={{ color: "#b0b0b0", margin: "0", fontSize: "14px" }}>
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Back Button */}
      <div style={{ textAlign: "center", marginTop: "60px" }}>
        <Button
          onClick={() => setLocation("/")}
          style={{
            padding: "10px 20px",
            background: "transparent",
            color: "#f4a261",
            border: "2px solid #f4a261",
            borderRadius: "8px",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          ← Back to Home
        </Button>
      </div>
    </div>
  );
}
