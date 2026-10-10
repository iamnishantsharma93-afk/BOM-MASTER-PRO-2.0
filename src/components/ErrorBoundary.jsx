import { Component } from "react";

// Catches render-time errors anywhere in the tree and
// shows a friendly fallback with a reload button instead
// of a blank screen.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || "Unknown error" };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught:", error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-boundary-card">
            <h2>Oops, something went wrong</h2>
            <p>{this.state.message}</p>
            <button className="primary" onClick={this.handleReload}>
              Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}