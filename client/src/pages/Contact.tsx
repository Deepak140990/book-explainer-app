import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

export default function Contact() {
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const submitFeedbackMutation = trpc.feedback.submitFeedback.useMutation();

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError("Please enter your name");
      return;
    }
    if (!formData.email.trim()) {
      setError("Please enter your email");
      return;
    }
    if (!formData.message.trim()) {
      setError("Please enter your message");
      return;
    }

    try {
      await submitFeedbackMutation.mutateAsync(formData);
      setSubmitted(true);
      setFormData({ name: "", email: "", message: "" });
      setTimeout(() => {
        setSubmitted(false);
        setLocation("/");
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Error submitting feedback. Please try again.");
    }
  };

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
      <div style={{ textAlign: "center", marginBottom: "40px" }}>
        <h1
          style={{
            fontSize: "clamp(28px, 6vw, 46px)",
            fontWeight: 900,
            color: "#f4a261",
            margin: "0 0 16px",
            letterSpacing: "-1px",
          }}
        >
          📬 Send Us Your Feedback
        </h1>
        <p style={{ color: "#b0b0b0", fontSize: "16px", margin: "0" }}>
          We'd love to hear from you! Share your thoughts, suggestions, or report any issues.
        </p>
      </div>

      {/* Success Message */}
      {submitted && (
        <div
          style={{
            maxWidth: "600px",
            margin: "0 auto 40px",
            padding: "20px",
            background: "#1a3a1a",
            border: "2px solid #4ade80",
            borderRadius: "8px",
            color: "#4ade80",
            textAlign: "center",
          }}
        >
          <p style={{ margin: "0", fontSize: "16px", fontWeight: "bold" }}>
            ✅ Thank you! Your feedback has been received. We'll get back to you soon.
          </p>
        </div>
      )}

      {/* Form */}
      <div
        style={{
          maxWidth: "600px",
          margin: "0 auto",
          padding: "40px",
          background: "#1a1a2e",
          borderRadius: "12px",
          border: "2px solid #2a2a3e",
        }}
      >
        <form onSubmit={handleSubmit}>
          {/* Name Field */}
          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                color: "#f4a261",
                fontWeight: "bold",
                marginBottom: "8px",
                fontSize: "14px",
              }}
            >
              Your Name
            </label>
            <Input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter your full name"
              style={{
                width: "100%",
                padding: "12px 16px",
                background: "#0f0e17",
                border: "2px solid #2a2a3e",
                color: "#fff",
                borderRadius: "8px",
                fontSize: "14px",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Email Field */}
          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                color: "#f4a261",
                fontWeight: "bold",
                marginBottom: "8px",
                fontSize: "14px",
              }}
            >
              Your Email
            </label>
            <Input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="your.email@example.com"
              style={{
                width: "100%",
                padding: "12px 16px",
                background: "#0f0e17",
                border: "2px solid #2a2a3e",
                color: "#fff",
                borderRadius: "8px",
                fontSize: "14px",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Message Field */}
          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                color: "#f4a261",
                fontWeight: "bold",
                marginBottom: "8px",
                fontSize: "14px",
              }}
            >
              Your Message
            </label>
            <textarea
              name="message"
              value={formData.message}
              onChange={handleChange}
              placeholder="Tell us what you think..."
              rows={6}
              style={{
                width: "100%",
                padding: "12px 16px",
                background: "#0f0e17",
                border: "2px solid #2a2a3e",
                color: "#fff",
                borderRadius: "8px",
                fontSize: "14px",
                fontFamily: "inherit",
                boxSizing: "border-box",
                resize: "vertical",
              }}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div
              style={{
                marginBottom: "20px",
                padding: "12px",
                background: "#2a1a1a",
                border: "2px solid #c44545",
                borderRadius: "8px",
                color: "#ff6b6b",
                fontSize: "14px",
              }}
            >
              {error}
            </div>
          )}

          {/* Submit Button */}
          <div style={{ display: "flex", gap: "12px" }}>
            <Button
              type="submit"
              disabled={submitFeedbackMutation.isPending}
              style={{
                flex: 1,
                padding: "12px 24px",
                background: "#f4a261",
                color: "#0f0e17",
                border: "none",
                borderRadius: "8px",
                fontWeight: "bold",
                cursor: submitFeedbackMutation.isPending ? "not-allowed" : "pointer",
                opacity: submitFeedbackMutation.isPending ? 0.6 : 1,
                fontSize: "14px",
              }}
            >
              {submitFeedbackMutation.isPending ? "Sending..." : "Send Feedback"}
            </Button>

            <Button
              type="button"
              onClick={() => setLocation("/")}
              style={{
                flex: 1,
                padding: "12px 24px",
                background: "transparent",
                color: "#f4a261",
                border: "2px solid #f4a261",
                borderRadius: "8px",
                fontWeight: "bold",
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>

      {/* Contact Info */}
      <div
        style={{
          maxWidth: "600px",
          margin: "40px auto 0",
          padding: "30px",
          textAlign: "center",
          borderTop: "2px solid #2a2a3e",
          color: "#b0b0b0",
        }}
      >
        <p style={{ margin: "0 0 12px", fontSize: "14px" }}>
          📧 Email: deepakg151089@gmail.com
        </p>
        <p style={{ margin: "0", fontSize: "14px" }}>
          📞 Phone: Deepak Gupta - 8840778831
        </p>
      </div>
    </div>
  );
}
