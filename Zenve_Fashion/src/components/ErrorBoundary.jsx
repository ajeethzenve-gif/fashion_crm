import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an unhandled error:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "#FAF7F2",
            color: "#382414",
            fontFamily: "'Inter', sans-serif",
            padding: "24px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              maxWidth: "500px",
              background: "#FFFFFF",
              padding: "36px",
              borderRadius: "16px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
              border: "1px solid #EADBCC",
            }}
          >
            <h2
              style={{
                fontSize: "22px",
                margin: "0 0 12px",
                fontFamily: "Georgia, serif",
              }}
            >
              Something went wrong
            </h2>
            <p
              style={{
                fontSize: "14px",
                color: "#786552",
                marginBottom: "20px",
                lineHeight: "1.5",
              }}
            >
              An unexpected error occurred while rendering this page.
            </p>
            {this.state.error?.message && (
              <pre
                style={{
                  background: "#FFF4ED",
                  color: "#9C4221",
                  padding: "12px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  textAlign: "left",
                  overflowX: "auto",
                  marginBottom: "20px",
                }}
              >
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={this.handleReload}
              style={{
                background: "#965B1C",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "8px",
                padding: "10px 24px",
                fontWeight: "600",
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
