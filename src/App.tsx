import { useEffect, useRef, useState, type FormEvent } from "react";
import { io, Socket } from "socket.io-client";

type User = {
  id: string;
  email: string;
  username: string;
  status: string;
};

type ChatMessage = {
  id: string;
  fromUserId: string;
  toUserId: string;
  content: string | null;
  type: "text" | "media";
  createdAt: string;
};

const API_BASE = "http://localhost:8080";

const App = () => {
  const [loginEmail, setLoginEmail] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [searchEmail, setSearchEmail] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState("");
  const socketRef = useRef<Socket | null>(null);
  const selectedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    selectedUserIdRef.current = selectedUser?.id || null;
  }, [selectedUser]);

  useEffect(() => {
    if (!currentUser) return;

    const socket = io(API_BASE, { transports: ["websocket"] });
    socketRef.current = socket;
    socket.emit("register", currentUser.id);

    socket.on("dm", (msg: ChatMessage) => {
      const peerId = selectedUserIdRef.current;
      const isCurrentThread =
        (msg.fromUserId === currentUser.id && msg.toUserId === peerId) ||
        (msg.fromUserId === peerId && msg.toUserId === currentUser.id);

      if (isCurrentThread) {
        setMessages((prev) => [...prev, msg]);
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [currentUser]);

  useEffect(() => {
    const loadHistory = async () => {
      if (!currentUser || !selectedUser) return;
      const res = await fetch(
        `${API_BASE}/chat/history?userId=${currentUser.id}&peerId=${selectedUser.id}`
      );
      const data = await res.json();
      setMessages(data.data || []);
    };

    loadHistory();
  }, [currentUser, selectedUser]);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoginError("");

    const res = await fetch(`${API_BASE}/users/search?email=${loginEmail}`);
    const data = await res.json();
    const user = data?.data?.[0] as User | undefined;

    if (!user) {
      setLoginError("Không tìm thấy user theo email.");
      return;
    }

    setCurrentUser(user);
  };

  const handleGoogleLogin = () => {
    window.location.href = `${API_BASE}/auth/google`;
  };

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    const res = await fetch(`${API_BASE}/users/search?email=${searchEmail}`);
    const data = await res.json();
    setSearchResults(data.data || []);
  };

  const handleSend = (e: FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedUser || !messageText.trim()) return;

    socketRef.current?.emit("dm", {
      fromUserId: currentUser.id,
      toUserId: selectedUser.id,
      text: messageText.trim(),
    });

    setMessageText("");
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get("token");

    if (tokenFromUrl) {
      localStorage.setItem("authToken", tokenFromUrl);
      params.delete("token");
      window.history.replaceState({}, "", window.location.pathname);
    }

    const token = localStorage.getItem("authToken");
    if (!token) return;

    fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setCurrentUser(data.data))
      .catch(() => localStorage.removeItem("authToken"));
  }, []);

  if (!currentUser) {
    return (
      <main className="page">
        <section className="card">
          <h1 className="title">Login</h1>
          <form className="form" onSubmit={handleLogin}>
            <label className="label">
              Username <span className="req">*</span>
              <input
                className="input"
                type="email"
                placeholder="you@email.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
              />
            </label>
            <label className="label">
              Password <span className="req">*</span>
              <input
                className="input"
                type="password"
                placeholder="••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
              />
            </label>
            <div className="row between">
              <label className="checkbox">
                <input type="checkbox" /> Remember Me
              </label>
              <a className="link" href="#">
                Lost your password?
              </a>
            </div>
            {loginError && <p className="error">{loginError}</p>}
            <button className="btn primary" type="submit">
              Login
            </button>
          </form>
          <div className="socials">
            <button className="btn social fb" type="button">
              Login with Facebook
            </button>
            <button
              className="btn social google"
              type="button"
              onClick={handleGoogleLogin}
            >
              Login with Google
            </button>
            <button className="btn social linkedin" type="button">
              Login with LinkedIn
            </button>
            <button className="btn social github" type="button">
              Login with GitHub
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="page chat">
      <section className="sidebar">
        <div className="me">
          <div className="me-title">You</div>
          <div className="me-email">{currentUser.email}</div>
        </div>

        <form className="search" onSubmit={handleSearch}>
          <input
            className="input"
            type="text"
            placeholder="Search user by email"
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
          />
          <button className="btn" type="submit">Search</button>
        </form>

        <div className="results">
          {searchResults.map((u) => (
            <button
              key={u.id}
              className={`result ${selectedUser?.id === u.id ? "active" : ""}`}
              onClick={() => setSelectedUser(u)}
            >
              <div className="result-name">{u.email}</div>
              <div className="result-meta">{u.username || "-"}</div>
            </button>
          ))}
        </div>
      </section>

      <section className="chat-area">
        <header className="chat-header">
          <div className="chat-title">
            {selectedUser ? `Chat with ${selectedUser.email}` : "Select a user"}
          </div>
        </header>

        <div className="chat-body">
          {selectedUser ? (
            messages.map((m) => (
              <div
                key={m.id}
                className={`bubble ${m.fromUserId === currentUser.id ? "me" : "them"}`}
              >
                {m.content}
              </div>
            ))
          ) : (
            <div className="empty">Search and select a user to chat.</div>
          )}
        </div>

        <form className="chat-input" onSubmit={handleSend}>
          <input
            className="input"
            type="text"
            placeholder="Type a message"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            disabled={!selectedUser}
          />
          <button className="btn primary" type="submit" disabled={!selectedUser}>
            Send
          </button>
        </form>
      </section>
    </main>
  );
};

export default App;
