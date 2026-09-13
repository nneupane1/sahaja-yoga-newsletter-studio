import React from "react";
import { createRoot } from "react-dom/client";
import "../app/globals.css";
import { AuthApp } from "./auth-app";

class AuthenticationBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <main className="min-h-dvh p-8"><h1 className="text-2xl font-bold">Sahaja Yoga Newsletter Studio</h1><p className="my-4">Account access could not start. Please check your connection and try again.</p><button className="auth-action" onClick={() => location.reload()}>Try again</button></main>;
    return this.props.children;
  }
}
createRoot(document.getElementById("root")!).render(<React.StrictMode><AuthenticationBoundary><AuthApp/></AuthenticationBoundary></React.StrictMode>);
