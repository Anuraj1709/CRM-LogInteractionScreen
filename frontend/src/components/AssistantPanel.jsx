import { useLayoutEffect, useRef } from "react";

function AssistantPanel({
  chatInput,
  setChatInput,
  messages,
  onSubmit,
  assistantStatus
}) {
  const textAreaRef = useRef(null);

  useLayoutEffect(() => {
    if (!textAreaRef.current) {
      return;
    }

    textAreaRef.current.style.height = "auto";
    textAreaRef.current.style.height = `${textAreaRef.current.scrollHeight}px`;
  }, [chatInput]);

  return (
    <aside className="panel assistant-panel">
      <div className="panel-header">
        <div>
          <h2>AI Assistant</h2>
          <p>Log interaction via chat</p>
        </div>
      </div>

      <div className="chat-thread">
        {messages.map((message, index) => (
          <div key={`${message.role}-${index}`} className={`message-bubble ${message.role}`}>
            <span>{message.role === "assistant" ? "AI" : "You"}</span>
            <p>{message.content}</p>
          </div>
        ))}
      </div>

      <form className="chat-composer" onSubmit={onSubmit}>
        <textarea
          ref={textAreaRef}
          placeholder="Describe interaction..."
          value={chatInput}
          onChange={(event) => setChatInput(event.target.value)}
          rows="1"
        />
        <button type="submit" className="primary-button" disabled={assistantStatus === "loading"}>
          {assistantStatus === "loading" ? "Thinking..." : "Log"}
        </button>
      </form>
    </aside>
  );
}

export default AssistantPanel;
